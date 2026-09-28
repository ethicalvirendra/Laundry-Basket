import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  io.Socket? _socket;
  ll.LatLng _riderPos = const ll.LatLng(23.2599, 77.4126); // Default Bhopal
  ll.LatLng? _customerPos;
  String _status = "Loading Tracking...";
  String _riderName = "Your Rider";
  String _riderPhone = "";
  bool _isDisposed = false;
  int _currentStepIndex = -1;
  final MapController _mapController = MapController();
  String? _pickupCode;
  String? _deliveryCode;
  String? _pickupPhoto;
  String? _deliveryPhoto;
  String? _source;
  final ScrollController _scrollController = ScrollController();

  final List<String> _trackingSteps = [
    "Pending",
    "Out for Pickup",
    "Pickup done",
    "At store",
    "Processing",
    "Washing",
    "Drying",
    "Ironing",
    "Ready",
    "Out for Delivery",
    "Completed"
  ];

  void _scrollToActiveStep() {
    if (_scrollController.hasClients && _currentStepIndex >= 0) {
      double offset = (_currentStepIndex * 120.0) - 100.0;
      if (offset < 0) offset = 0;
      try {
        _scrollController.animateTo(
          offset,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
        );
      } catch (_) {}
    }
  }

  void _updateStepIndex(String status) {
    final s = status.toLowerCase();
    if (s == 'pending' || s == 'scheduled') _currentStepIndex = 0;
    else if (s.contains('out for pickup')) _currentStepIndex = 1;
    else if (s.contains('pickup done')) _currentStepIndex = 2;
    else if (s.contains('delivered at store') || s.contains('at store')) _currentStepIndex = 3;
    else if (s.contains('processing')) _currentStepIndex = 4;
    else if (s.contains('washing')) _currentStepIndex = 5;
    else if (s.contains('drying')) _currentStepIndex = 6;
    else if (s.contains('ironing')) _currentStepIndex = 7;
    else if (s.contains('ready')) _currentStepIndex = 8;
    else if (s.contains('out for delivery')) _currentStepIndex = 9;
    else if (s.contains('completed') || s.contains('delivered to cx') || s.contains('delivered')) _currentStepIndex = 10;
    else _currentStepIndex = 0;

    if (_currentStepIndex >= 0 && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToActiveStep();
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _initSocket();
    _fetchOrderDetails();
  }

  Future<void> _fetchOrderDetails() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('customer_token');

      http.Response? response;
      if (token != null && token.isNotEmpty) {
        try {
          response = await http.get(
            Uri.parse('${AppConfig.baseUrl}/api/orders/${widget.orderId}'),
            headers: {'Authorization': 'Bearer $token'},
          );
        } catch (_) {}
      }

      // Always fallback to public tracking endpoint if auth failed or no token
      if (response == null || response.statusCode != 200) {
        response = await http.get(
          Uri.parse('${AppConfig.baseUrl}/api/public/track/${widget.orderId}'),
        );
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (_isDisposed || !mounted) return;

        setState(() {
          _status = data['status'] ?? "Pending";
          _source = data['source']?.toString();
          _pickupCode = data['pickupCode']?.toString();
          _deliveryCode = data['deliveryCode']?.toString();
          _pickupPhoto = data['pickupPhoto']?.toString();
          _deliveryPhoto = data['deliveryPhoto']?.toString();
          _riderName = data['assignedRiderName'] ?? data['riderName'] ?? "Your Rider";
          _riderPhone = (data['assignedRiderPhone'] ?? data['riderPhone'] ?? "").toString();

          // Parse rider location safely
          if (data['riderLocation'] != null && data['riderLocation'] is Map) {
            final lat = double.tryParse(data['riderLocation']['lat']?.toString() ?? '');
            final lng = double.tryParse(data['riderLocation']['lng']?.toString() ?? '');
            if (lat != null && lng != null) {
              _riderPos = ll.LatLng(lat, lng);
            }
          }

          // Parse customer location if available
          if (data['customerLocation'] != null && data['customerLocation'] is Map) {
            final lat = double.tryParse(data['customerLocation']['lat']?.toString() ?? '');
            final lng = double.tryParse(data['customerLocation']['lng']?.toString() ?? '');
            if (lat != null && lng != null) {
              _customerPos = ll.LatLng(lat, lng);
            }
          }

          _updateStepIndex(_status);
        });

        try {
          _mapController.move(_riderPos, 15.0);
        } catch (_) {}

        if ((_status == 'Completed' || _status.toLowerCase().contains('delivered')) && mounted) {
          _showReviewBottomSheet();
        }
      }
    } catch (e) {
      debugPrint("Error fetching order details: $e");
    }
  }

  Future<void> _initSocket() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('customer_token');

      _socket = io.io(AppConfig.baseUrl, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': true,
        if (token != null) 'auth': {'token': token},
      });

      _socket!.onConnect((_) {
        debugPrint('Tracking Socket Connected');
        _socket!.emit('join_room', {
          'role': 'customer',
          'orderId': widget.orderId,
          if (token != null) 'token': token,
        });
      });

      _socket!.on('rider_moved', (data) {
        if (_isDisposed || !mounted) return;
        if (data != null && data is Map) {
          final newLat = double.tryParse(data['lat']?.toString() ?? '');
          final newLng = double.tryParse(data['lng']?.toString() ?? '');
          if (newLat != null && newLng != null) {
            setState(() {
              _riderPos = ll.LatLng(newLat, newLng);
            });
            try {
              _mapController.move(_riderPos, 15.5);
            } catch (_) {}
          }
        }
      });
    } catch (e) {
      debugPrint("Socket init error: $e");
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    try {
      _socket?.disconnect();
      _socket?.dispose();
    } catch (_) {}
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Track Order #${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(AppConfig.foregroundColor),
        elevation: 0,
      ),
      body: Stack(
        children: [
          // OpenStreetMap via flutter_map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _riderPos,
              initialZoom: 14.5,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.laundrybasket.app',
              ),
              MarkerLayer(
                markers: [
                  // Customer destination marker
                  if (_customerPos != null)
                    Marker(
                      point: _customerPos!,
                      width: 44,
                      height: 44,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 3)),
                          ],
                        ),
                        child: const Icon(Icons.home_filled, color: Colors.white, size: 22),
                      ),
                    ),
                  // Rider live location marker
                  Marker(
                    point: _riderPos,
                    width: 52,
                    height: 52,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Color(AppConfig.primaryColor),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Colors.black38, blurRadius: 8, offset: Offset(0, 4)),
                        ],
                      ),
                      child: const Icon(Icons.two_wheeler_rounded, color: Colors.white, size: 28),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Bottom Tracking Status Sheet
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.55,
              ),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.local_shipping_rounded, color: Color(AppConfig.primaryColor)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _status,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: Color(AppConfig.foregroundColor),
                                ),
                              ),
                              const Text(
                                'Live Location Tracking',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF667085),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    if (_riderPhone.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: const BoxDecoration(
                                color: Color(AppConfig.primaryColor),
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Icon(Icons.person, color: Colors.white, size: 20),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _riderName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13,
                                      color: Color(AppConfig.foregroundColor),
                                    ),
                                  ),
                                  const Text(
                                    "Assigned Delivery Partner",
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF667085),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () async {
                                final uri = Uri.parse('tel:$_riderPhone');
                                if (await canLaunchUrl(uri)) {
                                  await launchUrl(uri);
                                }
                              },
                              icon: const Icon(Icons.call, color: Colors.white, size: 16),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.green,
                                padding: const EdgeInsets.all(8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 18),

                    // Horizontal Stepper UI
                    if (_currentStepIndex >= 0)
                      SizedBox(
                        height: 72,
                        child: SingleChildScrollView(
                          controller: _scrollController,
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: List.generate(_trackingSteps.length, (index) {
                              bool isActive = index <= _currentStepIndex;
                              bool isLast = index == _trackingSteps.length - 1;

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Column(
                                    children: [
                                      Container(
                                        width: 22,
                                        height: 22,
                                        decoration: BoxDecoration(
                                          color: isActive ? const Color(AppConfig.primaryColor) : Colors.grey[300],
                                          shape: BoxShape.circle,
                                        ),
                                        child: isActive
                                            ? const Icon(Icons.check, color: Colors.white, size: 14)
                                            : null,
                                      ),
                                      const SizedBox(height: 6),
                                      SizedBox(
                                        width: 76,
                                        child: Text(
                                          _trackingSteps[index],
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                            color: isActive ? const Color(AppConfig.foregroundColor) : Colors.grey[500],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (!isLast)
                                    Container(
                                      width: 32,
                                      height: 2,
                                      margin: const EdgeInsets.only(top: 10),
                                      color: isActive && index < _currentStepIndex
                                          ? const Color(AppConfig.primaryColor)
                                          : Colors.grey[300],
                                    ),
                                ],
                              );
                            }),
                          ),
                        ),
                      ),

                    if (_currentStepIndex < 0) ...[
                      const LinearProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(AppConfig.primaryColor)),
                        backgroundColor: Color(0xFFE2E8F0),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Security Verification PINs (Bypassed for Walk-in and WhatsApp orders)
                    if (!((_source ?? '').toLowerCase().contains('walk-in') || (_source ?? '').toLowerCase().contains('whatsapp')) && _pickupCode != null && (_status == 'Pending' || _status.toLowerCase().contains('pickup'))) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.blue.shade200),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.vpn_key_rounded, color: Colors.blue.shade700, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              "Pickup PIN: ",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.blue.shade900,
                              ),
                            ),
                            Text(
                              _pickupCode!,
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                                color: Colors.blue.shade900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    if (!((_source ?? '').toLowerCase().contains('walk-in') || (_source ?? '').toLowerCase().contains('whatsapp')) && _deliveryCode != null && (_status == 'Processing' || _status.toLowerCase().contains('ready') || _status.toLowerCase().contains('delivery'))) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.verified_user_rounded, color: Colors.green.shade700, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              "Delivery PIN: ",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.green.shade900,
                              ),
                            ),
                            Text(
                              _deliveryCode!,
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                                color: Colors.green.shade900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Proof of Service Photos
                    if (_pickupPhoto != null || _deliveryPhoto != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.photo_camera_rounded, size: 16, color: Color(AppConfig.primaryColor)),
                                SizedBox(width: 8),
                                Text(
                                  "Proof of Service Photos",
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(AppConfig.foregroundColor),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                if (_pickupPhoto != null)
                                  Expanded(
                                    child: _buildPhotoThumbnail(context, "Pickup Photo", _pickupPhoto!),
                                  ),
                                if (_pickupPhoto != null && _deliveryPhoto != null)
                                  const SizedBox(width: 10),
                                if (_deliveryPhoto != null)
                                  Expanded(
                                    child: _buildPhotoThumbnail(context, "Delivery Photo", _deliveryPhoto!),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 12),
                    Text(
                      '$_riderName is moving towards your location. Please keep your phone reachable.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF667085), height: 1.4),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoThumbnail(BuildContext context, String label, String base64OrUrl) {
    ImageProvider imageProvider;
    try {
      if (base64OrUrl.startsWith('data:image')) {
        final cleanBase64 = base64OrUrl.split(',').last;
        imageProvider = MemoryImage(base64Decode(cleanBase64));
      } else if (base64OrUrl.startsWith('http')) {
        imageProvider = NetworkImage(base64OrUrl);
      } else {
        imageProvider = MemoryImage(base64Decode(base64OrUrl));
      }
    } catch (_) {
      return Container(
        height: 75,
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
      );
    }

    return GestureDetector(
      onTap: () {
        showDialog(
          context: context,
          builder: (_) => Dialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
                  child: Image(
                    image: imageProvider,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Padding(
                      padding: EdgeInsets.all(24.0),
                      child: Text("Unable to load image"),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image(
              image: imageProvider,
              height: 75,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 75,
                color: Colors.grey.shade200,
                child: const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitReview(int riderRating, int serviceRating, String feedback, double tipAmount) async {
    try {
      final url = Uri.parse('${AppConfig.baseUrl}/api/reviews');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'orderId': widget.orderId,
          'riderRating': riderRating,
          'serviceRating': serviceRating,
          'feedback': feedback,
          'tipAmount': tipAmount,
        }),
      );
    } catch (e) {
      debugPrint('Failed to submit review: $e');
    }
  }

  void _showReviewBottomSheet() {
    int riderRating = 5;
    int serviceRating = 5;
    double selectedTip = 0;
    TextEditingController feedbackController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Rate Your Experience',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(AppConfig.foregroundColor),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Your feedback helps us improve our service.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF667085)),
                    ),
                    const SizedBox(height: 24),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Rider Rating',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(AppConfig.foregroundColor)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return IconButton(
                          icon: Icon(
                            index < riderRating ? Icons.star : Icons.star_border,
                            color: Colors.orange,
                            size: 36,
                          ),
                          onPressed: () {
                            setModalState(() {
                              riderRating = index + 1;
                            });
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 18),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Service Rating',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(AppConfig.foregroundColor)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return IconButton(
                          icon: Icon(
                            index < serviceRating ? Icons.star : Icons.star_border,
                            color: Colors.orange,
                            size: 36,
                          ),
                          onPressed: () {
                            setModalState(() {
                              serviceRating = index + 1;
                            });
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 18),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Tip Your Rider',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(AppConfig.foregroundColor)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [0.0, 10.0, 20.0, 50.0].map((amount) {
                        bool isSelected = selectedTip == amount;
                        return GestureDetector(
                          onTap: () {
                            setModalState(() {
                              selectedTip = amount;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(AppConfig.primaryColor) : Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected ? const Color(AppConfig.primaryColor) : Colors.grey[300]!,
                              ),
                            ),
                            child: Text(
                              amount == 0 ? "No Tip" : "₹${amount.toInt()}",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white : Colors.black87,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: feedbackController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Any specific feedback? (Optional)',
                        hintStyle: const TextStyle(color: Color(0xFF98A2B3)),
                        filled: true,
                        fillColor: const Color(0xFFF2F4F7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(AppConfig.primaryColor),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () {
                          _submitReview(riderRating, serviceRating, feedbackController.text, selectedTip);
                          Navigator.pop(context);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Thank you for your feedback!'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          }
                        },
                        child: const Text(
                          'Submit Review',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
