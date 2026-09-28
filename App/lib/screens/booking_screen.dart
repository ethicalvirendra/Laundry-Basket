import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import '../config.dart';
import '../services/state_service.dart';
import '../services/telemetry_service.dart';
import '../models/cart_model.dart';
import '../models/order_model.dart';
import '../widgets/common.dart';
import 'map_picker_screen.dart';
import 'login_screen.dart';
import '../services/order_service.dart';
import 'order_tracking_screen.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final List<String> _selected = [];
  String _gender = 'Men';
  final TextEditingController _nameController = TextEditingController(
    text: userNameState.value == "Laundry Basket User"
        ? ""
        : userNameState.value,
  );
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _customTipController = TextEditingController();
  final TextEditingController _referralController = TextEditingController();
  bool _isLocating = false;
  bool _isLoading = false;
  String _selectedSlot = 'Morning Slot (8:00 AM - 12:00 PM)';

  int _tipAmount = 0;
  bool _isCustomTip = false;

  String? _appliedReferralCode;
  int _referralDiscount = 0;
  bool _isValidatingReferral = false;
  String? _referralMessage;

  int _customerWalletPoints = 0;
  bool _isRedeemingPoints = false;
  int _redeemedPoints = 0;
  int _pointsDiscount = 0;

  // Store Location: Ayodhya Nagar Hub, Bhopal
  static const double storeLat = 23.2766;
  static const double storeLng = 77.4658;
  double? _customerLat;
  double? _customerLng;
  double? _calculatedDistanceKm;
  Timer? _geocodeTimer;

  int _calculateDistanceFee(int subtotal) {
    if (subtotal >= 500 || subtotal == 0) return 0;
    if (_calculatedDistanceKm != null) {
      final d = _calculatedDistanceKm!;
      if (d <= 3.0) return 0;
      if (d <= 5.0) return 27;
      if (d <= 8.0) return 47;
      if (d <= 12.0) return 77;
      final extraKm = (d - 12.0).ceil();
      return 97 + (extraKm * 10);
    }
    return 27; // Default standard fee
  }

  void _debounceGeocode() {
    _geocodeTimer?.cancel();
    _geocodeTimer = Timer(const Duration(milliseconds: 900), () {
      final text = _addressController.text.trim();
      if (text.length >= 5 && mounted) {
        _geocodeAddress(text);
      }
    });
  }

  Future<void> _geocodeAddress(String addr) async {
    try {
      final query = addr.toLowerCase().contains('bhopal') ? addr : '$addr, Bhopal, Madhya Pradesh';
      final locations = await locationFromAddress(query);
      if (locations.isNotEmpty && mounted) {
        final loc = locations.first;
        final meters = Geolocator.distanceBetween(storeLat, storeLng, loc.latitude, loc.longitude);
        setState(() {
          _customerLat = loc.latitude;
          _customerLng = loc.longitude;
          _calculatedDistanceKm = double.parse((meters / 1000.0).toStringAsFixed(1));
        });
      }
    } catch (_) {}
  }

  @override
  void initState() {
    super.initState();
    _fetchCustomerPoints();
    _addressController.addListener(_debounceGeocode);
    _customTipController.addListener(() {
      if (_isCustomTip) {
        final val = int.tryParse(_customTipController.text) ?? 0;
        setState(() {
          _tipAmount = val;
        });
      }
    });
  }

  Future<void> _fetchCustomerPoints() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('customer_token') ?? prefs.getString('user_token');
      if (token != null && token.length >= 2000) {
        prefs.remove('customer_token');
        token = null;
      }
      if (token == null) return;
      final res = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/referral/details'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _customerWalletPoints = (data['points'] ?? data['walletBalance'] as num?)?.toInt() ?? 0;
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _validateAndApplyReferral() async {
    final code = _referralController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isValidatingReferral = true;
      _referralMessage = null;
    });

    try {
      final currentPhone = _phoneController.text.trim();
      final res = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/referral/validate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'code': code,
          'referralCode': code,
          if (currentPhone.isNotEmpty) 'phone': currentPhone,
        }),
      );

      dynamic data;
      try {
        data = jsonDecode(res.body);
      } catch (_) {
        data = null;
      }

      if (res.statusCode == 200 && data != null && data['valid'] == true) {
        final disc = (data['discountAmount'] ?? data['discount'] ?? 100) is num
            ? (data['discountAmount'] ?? data['discount'] ?? 100).toInt()
            : 100;
        final appliedCode = data['code'] ?? data['referralCode'] ?? code;
        final msg = data['message'] ?? 'Promo code $appliedCode applied! ₹$disc OFF';

        setState(() {
          _appliedReferralCode = appliedCode;
          _referralDiscount = disc;
          _referralMessage = msg;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 $msg'),
              backgroundColor: const Color(0xFF059669),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      } else {
        final serverMsg = data is Map ? (data['message'] ?? data['error']) : null;
        final failMsg = serverMsg?.toString() ?? 'Invalid referral or promo code';

        setState(() {
          _appliedReferralCode = null;
          _referralDiscount = 0;
          _referralMessage = failMsg;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(failMsg),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      }
    } catch (e) {
      const failMsg = 'Unable to verify code. Please check your internet connection.';
      setState(() {
        _referralMessage = failMsg;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(failMsg),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isValidatingReferral = false);
      }
    }
  }

  void _removeReferralCode() {
    setState(() {
      _appliedReferralCode = null;
      _referralDiscount = 0;
      _referralMessage = null;
      _referralController.clear();
    });
  }

  void _toggleRedeemPoints(List<CartItem> cartItems, int subtotal) {
    if (_isRedeemingPoints) {
      setState(() {
        _isRedeemingPoints = false;
        _redeemedPoints = 0;
        _pointsDiscount = 0;
      });
      return;
    }

    // Check minimum 100 points
    if (_customerWalletPoints < 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('You have $_customerWalletPoints points. Minimum and maximum 100 Dry Cleaning points required to redeem ₹100 discount.'),
          backgroundColor: Colors.orange.shade800,
        ),
      );
      return;
    }

    // Check if order contains Dry Cleaning
    final hasDryCleaning = cartItems.any((i) =>
            i.rateItem.name.toLowerCase().contains('dry clean') ||
            i.rateItem.category.toLowerCase().contains('dry clean')) ||
        _selected.any((s) => s.toLowerCase().contains('dry clean'));

    if (!hasDryCleaning) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('⚠️ Referral points are strictly usable on Dry Cleaning services only.'),
          backgroundColor: Colors.orange.shade800,
        ),
      );
      return;
    }

    // Check minimum order value (MOV ₹349)
    if (subtotal < 349) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('⚠️ Minimum order value of ₹349 on Dry Cleaning is required to redeem points.'),
          backgroundColor: Colors.orange.shade800,
        ),
      );
      return;
    }

    // Success: Apply 100 points
    setState(() {
      _isRedeemingPoints = true;
      _redeemedPoints = 100;
      _pointsDiscount = 100;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🎉 100 Dry Cleaning Points Redeemed! Flat ₹100 OFF.'),
        backgroundColor: Color(0xFF059669),
      ),
    );
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLocating = true);
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final meters = Geolocator.distanceBetween(storeLat, storeLng, position.latitude, position.longitude);
      final dist = double.parse((meters / 1000.0).toStringAsFixed(1));

      List<Placemark> placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty && mounted) {
        Placemark place = placemarks[0];
        String address = "${place.name ?? ''}, ${place.subLocality ?? ''}, ${place.locality ?? ''}, ${place.postalCode ?? ''}";
        setState(() {
          _customerLat = position.latitude;
          _customerLng = position.longitude;
          _calculatedDistanceKm = dist;
          _addressController.text = address;
        });
      } else if (mounted) {
        setState(() {
          _customerLat = position.latitude;
          _customerLng = position.longitude;
          _calculatedDistanceKm = dist;
          _addressController.text = "Lat: ${position.latitude.toStringAsFixed(5)}, Long: ${position.longitude.toStringAsFixed(5)}";
        });
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error getting location')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLocating = false);
      }
    }
  }

  @override
  void dispose() {
    _geocodeTimer?.cancel();
    _addressController.removeListener(_debounceGeocode);
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _customTipController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: isGuestMode,
      builder: (context, guest, _) {
        if (guest) {
          return Scaffold(
            backgroundColor: const Color(0xFFF5F8FF),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: const Icon(
                        Icons.lock_rounded,
                        size: 48,
                        color: Color(AppConfig.primaryColor),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Login Required',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF102A43),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'You need to log in to book a pickup.\nIt only takes 30 seconds!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        color: Color(0xFF667085),
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 36),
                    SizedBox(
                      width: double.infinity,
                      height: 58,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const LoginScreen(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.login_rounded),
                        label: const Text(
                          'Login / Sign Up',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(AppConfig.primaryColor),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        navigationIndex.value = 0;
                      },
                      child: const Text(
                        'Browse services instead',
                        style: TextStyle(
                          color: Color(0xFF667085),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return ValueListenableBuilder<List<CartItem>>(
      valueListenable: cartState,
      builder: (context, cartItems, _) {
        final subtotal = cartItems.fold<int>(
          0,
          (sum, item) => sum + (item.rateItem.bookingPrice * item.quantity),
        );
        final int deliveryFee = _calculateDistanceFee(subtotal);
        final int totalDiscount = _referralDiscount + _pointsDiscount;
        final totalAmount = math.max(0, (subtotal + deliveryFee + _tipAmount) - totalDiscount);

        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Book Pickup',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            centerTitle: true,
            backgroundColor: Colors.transparent,
            elevation: 0,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(
                  title: 'Schedule Pickup',
                  subtitle: 'Booking',
                ),
                const SizedBox(height: 32),

                // Booking Progress Indicator
                Row(
                  children: [
                    _buildProgressStep('Service', true),
                    _buildProgressDivider(true),
                    _buildProgressStep('Details', true),
                    _buildProgressDivider(false),
                    _buildProgressStep('Confirm', false),
                  ],
                ),
                const SizedBox(height: 40),

                // Package info banner
                if (cartItems.any((item) => item.rateItem.category == 'Membership')) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          const Color(AppConfig.primaryColor).withOpacity(0.12),
                          const Color(AppConfig.secondaryColor).withOpacity(0.06),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: const Color(AppConfig.primaryColor).withOpacity(0.35),
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.celebration_rounded,
                          color: Color(AppConfig.primaryColor),
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${cartItems.firstWhere((item) => item.rateItem.category == 'Membership').rateItem.name} Selected',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                  color: Color(AppConfig.foregroundColor),
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'The pickup scheduled today will activate your prepaid membership plan!',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(AppConfig.foregroundColor),
                                  fontWeight: FontWeight.w600,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                if (cartItems.isNotEmpty) ...[
                  const Text(
                    'Order Summary',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 30,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        ...cartItems.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.rateItem.name,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                    ),
                                    Text(
                                      'Quantity: ${item.quantity}',
                                      style: const TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                Text(
                                  '₹${item.rateItem.bookingPrice * item.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Subtotal',
                              style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '₹$subtotal',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  'Delivery Fee',
                                  style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                if (_calculatedDistanceKm != null)
                                  Text(
                                    ' (${_calculatedDistanceKm} KM)',
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                              ],
                            ),
                            Text(
                              deliveryFee == 0 ? 'FREE' : '₹$deliveryFee',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: deliveryFee == 0 ? Colors.green : Colors.black,
                              ),
                            ),
                          ],
                        ),
                        if (_tipAmount > 0) ...[
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Rider Tip',
                                style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '₹$_tipAmount',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ],
                          ),
                        ],
                        if (_appliedReferralCode != null && _referralDiscount > 0) ...[
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.card_giftcard_rounded, size: 14, color: Color(0xFF059669)),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Referral ($_appliedReferralCode)',
                                    style: const TextStyle(color: Color(0xFF059669), fontSize: 13, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                              Text(
                                '-₹$_referralDiscount',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF059669)),
                              ),
                            ],
                          ),
                        ],
                        if (_pointsDiscount > 0) ...[
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: const [
                                  Icon(Icons.stars_rounded, size: 14, color: Color(0xFF2563EB)),
                                  SizedBox(width: 4),
                                  Text(
                                    'Dry Cleaning Points (100 Pts)',
                                    style: TextStyle(color: Color(0xFF2563EB), fontSize: 13, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                              Text(
                                '-₹$_pointsDiscount',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF2563EB)),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'TOTAL PAYABLE',
                              style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF64748B), fontSize: 11, letterSpacing: 1),
                            ),
                            Text(
                              '₹$totalAmount',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 24,
                                color: Color(AppConfig.primaryColor),
                                letterSpacing: -1,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(AppConfig.accentColor).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.payments_rounded, size: 14, color: Color(AppConfig.accentColor)),
                              const SizedBox(width: 6),
                              Text(
                                'CASH ON DELIVERY',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(AppConfig.accentColor),
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                ] else ...[
                  const Text(
                    'Select Category',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildGenderButton('Men', Icons.man),
                      const SizedBox(width: 12),
                      _buildGenderButton('Women', Icons.woman),
                    ],
                  ),
                  const SizedBox(height: 32),

                  const Text(
                    'Select Services',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 3,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.9,
                    children: [
                      _buildServiceSelector('Dry Cleaning', Icons.checkroom),
                      _buildServiceSelector('Steam Iron', Icons.hot_tub),
                      _buildServiceSelector('Shoe Cleaning', Icons.directions_run),
                      _buildServiceSelector('Wash & Iron', Icons.wash),
                      _buildServiceSelector('Wash Only', Icons.water_drop),
                      _buildServiceSelector('Hotel Linen', Icons.hotel),
                      _buildServiceSelector('Combo of Pairs', Icons.group),
                    ],
                  ),
                  const SizedBox(height: 32),
                ],

                _buildInputField('Full Name', controller: _nameController),
                const SizedBox(height: 16),
                _buildInputField(
                  'Phone Number',
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 24),

                const Text(
                  'Preferred Time Slot',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, letterSpacing: -0.5),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildSlotCard(
                        title: 'Morning Slot',
                        time: '8 AM - 12 PM',
                        icon: Icons.wb_sunny_rounded,
                        iconColor: Colors.amber.shade600,
                        isSelected: _selectedSlot.startsWith('Morning'),
                        onTap: () => setState(() => _selectedSlot = 'Morning Slot (8:00 AM - 12:00 PM)'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildSlotCard(
                        title: 'Evening Slot',
                        time: '4 PM - 8 PM',
                        icon: Icons.nights_stay_rounded,
                        iconColor: Colors.indigo.shade400,
                        isSelected: _selectedSlot.startsWith('Evening'),
                        onTap: () => setState(() => _selectedSlot = 'Evening Slot (4:00 PM - 8:00 PM)'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _buildInputField(
                        'Pickup Address',
                        controller: _addressController,
                        maxLines: 3,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      children: [
                        _buildToolButton(
                          onPressed: _isLocating ? null : _getCurrentLocation,
                          icon: _isLocating
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.my_location, color: Color(AppConfig.primaryColor)),
                          tooltip: 'Auto-detect',
                        ),
                        const SizedBox(height: 8),
                        _buildToolButton(
                          onPressed: () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => MapPickerScreen(
                                  initialLat: _customerLat,
                                  initialLng: _customerLng,
                                ),
                              ),
                            );
                            if (result != null && mounted) {
                              if (result is Map) {
                                setState(() {
                                  _addressController.text = result['address']?.toString() ?? '';
                                  _customerLat = (result['lat'] as num?)?.toDouble();
                                  _customerLng = (result['lng'] as num?)?.toDouble();
                                  _calculatedDistanceKm = (result['distanceKm'] as num?)?.toDouble();
                                });
                              } else if (result is String) {
                                setState(() {
                                  _addressController.text = result;
                                });
                                _geocodeAddress(result);
                              }
                            }
                          },
                          icon: const Icon(Icons.map_outlined, color: Color(AppConfig.primaryColor)),
                          tooltip: 'Pick on Map',
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _buildReferralSection(cartItems, subtotal),
                const SizedBox(height: 24),
                _buildDeliveryAndPolicyCard(deliveryFee, subtotal),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline_rounded, color: Colors.amber.shade800, size: 18),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Service Notice: Deliveries & pickups follow scheduled time slots. In case of inclement weather, our riders ensure your garments remain completely sealed, protected, and dry.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF92400E),
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                AppButton(
                  label: 'Confirm Booking',
                  isLoading: _isLoading,
                  icon: Icons.check_circle_rounded,
                  onPressed: () async {
                    final name = _nameController.text.trim();
                    final phone = _phoneController.text.trim();
                    final addr = _addressController.text.trim();

                    if (name.isEmpty || name.length < 3) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please enter your full name'),
                        ),
                      );
                      return;
                    }

                    if (phone.length != 10 ||
                        !RegExp(r'^[0-9]+$').hasMatch(phone)) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Please enter a valid 10-digit phone number',
                          ),
                        ),
                      );
                      return;
                    }

                    if (addr.isEmpty || addr.length < 5) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Please enter a complete pickup address',
                          ),
                        ),
                      );
                      return;
                    }

                    if (cartItems.isEmpty && _selected.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please select services or add items to cart'),
                        ),
                      );
                      return;
                    }

                    // Check for Express Delivery or Premium Care confirmation
                    final hasExpress = cartItems.any((i) => i.rateItem.name.toLowerCase().contains('express') || i.rateItem.name.toLowerCase().contains('instant')) ||
                                       _selected.any((s) => s.toLowerCase().contains('express') || s.toLowerCase().contains('instant'));
                    final hasPremium = cartItems.any((i) => i.rateItem.name.toLowerCase().contains('premium')) ||
                                       _selected.any((s) => s.toLowerCase().contains('premium'));

                    if (hasExpress || hasPremium) {
                      String dialogTitle = 'Confirm Special Service Pickup';
                      String dialogMsg = 'Please confirm your order details before placing the pickup:';
                      if (hasExpress && hasPremium) {
                        dialogTitle = '⚡ Express Delivery & 👑 Premium Care';
                        dialogMsg = 'Your order includes Priority Express Delivery (2h @ ₹147 / 4h @ ₹97) and Premium Care (Luxury care starting @ ₹97).';
                      } else if (hasExpress) {
                        dialogTitle = '⚡ Express Delivery Pickup';
                        dialogMsg = 'Your order includes Priority Express Delivery (2-Hour @ ₹147 / 4-Hour @ ₹97). A priority rider will be dispatched for pickup.';
                      } else if (hasPremium) {
                        dialogTitle = '👑 Premium Care Pickup';
                        dialogMsg = 'Your order includes Premium Care (Delicate garment care, stain treatment & protective packaging starting @ ₹97).';
                      }

                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          title: Text(dialogTitle, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                          content: Text(dialogMsg, style: const TextStyle(fontSize: 14, height: 1.4)),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(ctx).pop(false),
                              child: const Text('Cancel', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E3A8A),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () => Navigator.of(ctx).pop(true),
                              child: const Text('Confirm Pickup', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );

                      if (confirmed != true) return;
                    }

                    setState(() => _isLoading = true);

                    try {
                      final services = cartItems.isNotEmpty
                          ? cartItems
                              .map((i) =>
                                  '${i.rateItem.name} x${i.quantity} (${i.rateItem.priceLabel}, billed ₹${(i.rateItem.bookingPrice * i.quantity).toInt()})')
                              .toList()
                          : _selected.map((s) => '$s (₹150)').toList();
                      if (_tipAmount > 0) {
                        services.add('Rider Tip (₹$_tipAmount)');
                      }

                      final total = totalAmount;
                      final prefs = await SharedPreferences.getInstance();
                      final token = prefs.getString('customer_token');
                      final safeToken = (token != null && token.length < 2000) ? token : null;
                      if (token != null && token.length >= 2000) {
                        prefs.remove('customer_token');
                      }

                      final response = await http.post(
                        Uri.parse('${AppConfig.baseUrl}/api/orders'),
                        headers: {
                          'Content-Type': 'application/json',
                          if (safeToken != null) 'Authorization': 'Bearer $safeToken',
                        },
                        body: jsonEncode({
                          'storeId': 'LBBPL',
                          'name': name,
                          'phone': phone,
                          'address': addr,
                          'services': services,
                          'subtotal': subtotal,
                          'deliveryFee': deliveryFee,
                          if (_calculatedDistanceKm != null) 'distanceKm': _calculatedDistanceKm,
                          if (_customerLat != null && _customerLng != null) 'customerLocation': {
                            'lat': _customerLat,
                            'lng': _customerLng,
                          },
                          'total': total,
                          'slot': _selectedSlot,
                          'source': 'App',
                          'sourceSegment': prefs.getString('customer_source_segment') ?? 'AP',
                          if (_appliedReferralCode != null) 'appliedReferralCode': _appliedReferralCode,
                          if (_referralDiscount > 0) 'referralDiscount': _referralDiscount,
                          if (_redeemedPoints > 0) 'redeemedPoints': _redeemedPoints,
                        }),
                      );

                      if (response.statusCode == 200 || response.statusCode == 201) {
                        final responseData = jsonDecode(response.body);
                        final orderId = responseData['id'] ?? responseData['orderId'] ?? 'LB1001';

                      final backendOrder = LaundryOrder(
                        id: orderId,
                        services: services,
                        address: addr,
                        price: '₹$total',
                        status: 'Pending',
                        date: DateTime.now(),
                        slot: _selectedSlot,
                      );

                      Telemetry.trackEvent('order_placed', {
                        'total': total,
                        'items_count': cartItems.length,
                        'source': 'App'
                      });
                      
                      ordersState.value = [...ordersState.value, backendOrder];
                      cartState.value = [];
                      
                      // Sync with cloud to get official ID and update local cache
                      fetchOrders();
                      
                      if (context.mounted) {
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => AlertDialog(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                            title: const Row(
                              children: [
                                Icon(Icons.check_circle_rounded, color: Colors.green, size: 28),
                                SizedBox(width: 12),
                                Text('Booking Successful!', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                              ],
                            ),
                            content: Text('Your Order $orderId has been scheduled. We will arrive within 60 minutes.'),
                            actions: [
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(context);
                                  navigationIndex.value = 0;
                                },
                                child: const Text('GO HOME', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                              ),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(AppConfig.primaryColor),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                onPressed: () {
                                  Navigator.pop(context);
                                  navigationIndex.value = 0;
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => OrderTrackingScreen(orderId: orderId),
                                    ),
                                  );
                                },
                                child: const Text('TRACK ORDER', style: TextStyle(fontWeight: FontWeight.w900)),
                              ),
                            ],
                          ),
                        );
                      }
                    } else {
                      String errMsg = 'Failed to place booking (Status ${response.statusCode})';
                      if (response.statusCode == 400 &&
                          (response.body.contains('Request Header') ||
                           response.body.contains('Too Large') ||
                           response.body.contains('nginx'))) {
                        final p = await SharedPreferences.getInstance();
                        await p.remove('customer_token');
                        errMsg = 'Session refreshed. Please tap Confirm Booking once more.';
                      } else {
                        try {
                          final dynamic errData = jsonDecode(response.body);
                          if (errData is Map) {
                            if (errData['error'] != null) {
                              errMsg = errData['error'] is Map
                                  ? (errData['error']['message']?.toString() ?? errData['error'].toString())
                                  : errData['error'].toString();
                            } else if (errData['message'] != null) {
                              errMsg = errData['message'].toString();
                            }
                          } else if (response.body.isNotEmpty && !response.body.contains('<html') && !response.body.contains('<!DOCTYPE')) {
                            errMsg = response.body.replaceAll(RegExp(r'<[^>]*>'), ' ').trim();
                            if (errMsg.length > 100) errMsg = errMsg.substring(0, 100);
                          } else {
                            errMsg = 'Server connection error (${response.statusCode}). Please try again.';
                          }
                        } catch (_) {
                          errMsg = 'Server connection error (${response.statusCode}). Please try again.';
                        }
                      }
                      throw Exception(errMsg);
                    }
                  } catch (e, stack) {
                    Telemetry.logError("Order Sync Failed", error: e, stack: stack);
                    if (!context.mounted) return;
                    String userMsg = e.toString();
                    if (userMsg.startsWith('Exception: ')) {
                      userMsg = userMsg.substring(11);
                    }
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
                            const SizedBox(width: 10),
                            Expanded(child: Text(userMsg, style: const TextStyle(fontWeight: FontWeight.bold))),
                          ],
                        ),
                        backgroundColor: Colors.red.shade800,
                        duration: const Duration(seconds: 4),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  } finally {
                    if (mounted) {
                      setState(() => _isLoading = false);
                    }
                  }
                  },
                ),
                const SizedBox(height: 150),
              ],
            ),
          ),
        );
      },
    );
  },
);
}

  Widget _buildProgressStep(String label, bool isCompleted) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isCompleted ? const Color(AppConfig.primaryColor) : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: isCompleted ? const Color(AppConfig.primaryColor) : const Color(AppConfig.borderColor),
              width: 2,
            ),
          ),
          child: isCompleted
              ? const Icon(Icons.check, color: Colors.white, size: 16)
              : Center(child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(AppConfig.borderColor), shape: BoxShape.circle))),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: isCompleted ? const Color(AppConfig.primaryColor) : Colors.grey,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildProgressDivider(bool isActive) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          height: 2,
          color: isActive ? const Color(AppConfig.primaryColor) : const Color(AppConfig.borderColor),
        ),
      ),
    );
  }

  Widget _buildSlotCard({
    required String title,
    required String time,
    required IconData icon,
    required Color iconColor,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(AppConfig.primaryColor) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(AppConfig.primaryColor) : const Color(AppConfig.borderColor),
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(AppConfig.primaryColor).withOpacity(0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ]
              : [],
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : iconColor,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(AppConfig.foregroundColor),
                fontWeight: FontWeight.w900,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              time,
              style: TextStyle(
                color: isSelected ? Colors.white.withOpacity(0.8) : Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToolButton({required VoidCallback? onPressed, required Widget icon, required String tooltip}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(AppConfig.borderColor).withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: icon,
        tooltip: tooltip,
        padding: const EdgeInsets.all(12),
      ),
    );
  }

  Widget _buildGenderButton(String label, IconData icon) {
    final isSelected = _gender == label;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _gender = label),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: 60,
          decoration: BoxDecoration(
            color: isSelected ? const Color(AppConfig.primaryColor) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? const Color(AppConfig.primaryColor)
                  : const Color(AppConfig.borderColor),
              width: 1.5,
            ),
            boxShadow: isSelected ? [
              BoxShadow(
                color: const Color(AppConfig.primaryColor).withOpacity(0.2),
                blurRadius: 15,
                offset: const Offset(0, 6),
              )
            ] : [],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : const Color(AppConfig.primaryColor),
                size: 22,
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : const Color(AppConfig.foregroundColor),
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  Widget _buildServiceSelector(String label, IconData icon) {
    final isSelected = _selected.contains(label);
    return GestureDetector(
      onTap: () => setState(
        () => isSelected ? _selected.remove(label) : _selected.add(label),
      ),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        decoration: BoxDecoration(
          color: isSelected ? const Color(AppConfig.primaryColor) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected
                ? const Color(AppConfig.primaryColor)
                : const Color(AppConfig.borderColor),
            width: 1.5,
          ),
          boxShadow: isSelected ? [
            BoxShadow(
              color: const Color(AppConfig.primaryColor).withOpacity(0.15),
              blurRadius: 10,
              offset: const Offset(0, 5),
            )
          ] : [],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withOpacity(0.2) : const Color(AppConfig.primaryColor).withOpacity(0.05),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.white : const Color(AppConfig.primaryColor),
                size: 24,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(AppConfig.foregroundColor),
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.2,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputField(
    String label, {
    int maxLines = 1,
    TextEditingController? controller,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: const Color(AppConfig.foregroundColor).withOpacity(0.4), fontWeight: FontWeight.w600),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(AppConfig.borderColor), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(AppConfig.primaryColor), width: 2),
        ),
      ),
    );
  }

  Widget _buildBenefitRow(IconData icon, String text, {bool isHighlight = false, String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: (isHighlight ? const Color(AppConfig.accentColor) : const Color(AppConfig.primaryColor)).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon, 
              color: isHighlight ? const Color(AppConfig.accentColor) : const Color(AppConfig.primaryColor), 
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 13.5, 
                    fontWeight: isHighlight ? FontWeight.w900 : FontWeight.w700,
                    color: isHighlight ? const Color(AppConfig.accentColor) : const Color(AppConfig.foregroundColor).withValues(alpha: 0.9),
                    height: 1.3,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                      height: 1.3,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryAndPolicyCard(int deliveryFee, int subtotal) {
    final bool isFree = deliveryFee == 0;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(AppConfig.borderColor), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isFree ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isFree ? Icons.local_shipping_rounded : Icons.delivery_dining_rounded,
                  color: isFree ? const Color(0xFF059669) : const Color(0xFF2563EB),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Doorstep Delivery & Service',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _calculatedDistanceKm != null
                          ? 'Distance: $_calculatedDistanceKm KM from Hub • ${isFree ? "Free Delivery Applied 🎉" : "Standard Delivery: ₹$deliveryFee"}'
                          : (isFree
                              ? '100% Free Doorstep Delivery Applied 🎉'
                              : 'Standard Delivery: ₹$deliveryFee (Free on orders ≥ ₹500)'),
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: isFree ? const Color(0xFF059669) : Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isFree ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isFree ? const Color(0xFFA7F3D0) : const Color(0xFFBFDBFE)),
                ),
                child: Text(
                  isFree ? 'FREE' : '₹$deliveryFee',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: isFree ? const Color(0xFF059669) : const Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),
          _buildBenefitRow(
            Icons.timer_outlined,
            '48-Hour Turnaround',
            subtitle: 'Standard processing & garment care by certified laundry experts.',
          ),
          _buildBenefitRow(
            Icons.payments_rounded,
            'Cash & UPI on Delivery',
            subtitle: 'Pay digitally via QR code or cash when your clean garments arrive.',
            isHighlight: true,
          ),
          _buildBenefitRow(
            Icons.verified_user_outlined,
            'Fabric Care & Quality Guarantee',
            subtitle: 'Separate color wash, gentle detergents, and anti-shrink steaming.',
          ),
        ],
      ),
    );
  }

  Widget _buildPolicyChip(String distance, String rate, {bool isHighlight = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: isHighlight ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(7),
        border: Border.all(
          color: isHighlight ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$distance: ',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: isHighlight ? const Color(0xFF047857) : const Color(0xFF475569),
            ),
          ),
          Text(
            rate,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w900,
              color: isHighlight ? const Color(0xFF047857) : const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeliveryPolicyModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.75,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Delivery & Service Policy',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: [
                    _buildPolicyDetailItem(
                      icon: Icons.local_shipping_outlined,
                      title: '1. Doorstep Pickup & Delivery',
                      desc: 'Doorstep pickup & delivery available across all service zones in Bhopal. Our riders contact you before arrival.',
                    ),
                    _buildPolicyDetailItem(
                      icon: Icons.check_circle_outline_rounded,
                      title: '2. Free Delivery Conditions',
                      desc: '• Orders within 3.0 KM are 100% FREE regardless of order size.\n• Orders valued at ₹500 or more within 5.0 KM enjoy FREE delivery.',
                    ),
                    _buildPolicyDetailItem(
                      icon: Icons.map_outlined,
                      title: '3. Distance Rates',
                      desc: '• 0 – 3.0 KM: FREE\n• 3.1 – 5.0 KM: ₹27\n• 5.1 – 8.0 KM: ₹47\n• 8.1 – 12.0 KM: ₹77\n• > 12.0 KM: ₹97 base + ₹10/KM',
                    ),
                    _buildPolicyDetailItem(
                      icon: Icons.schedule_rounded,
                      title: '4. Turnaround & Re-attempts',
                      desc: 'Standard processing is 24 to 48 hours. If you are unavailable, our rider reschedules free of charge for the first re-attempt.',
                    ),
                    _buildPolicyDetailItem(
                      icon: Icons.security_rounded,
                      title: '5. Garment Care & Liability',
                      desc: 'Industrial quality control with strict fabric separation. Any verified damage or loss is covered up to 5x service charge or ₹1,000.',
                    ),
                    _buildPolicyDetailItem(
                      icon: Icons.cancel_outlined,
                      title: '6. Free Cancellation',
                      desc: 'Orders can be cancelled free of charge prior to rider pickup. No questions asked.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(AppConfig.primaryColor),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('GOT IT', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPolicyDetailItem({required IconData icon, required String title, required String desc}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF2563EB), size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 3),
                Text(
                  desc,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildReferralSection(List<CartItem> cartItems, int subtotal) {
    final bool hasApplied = _appliedReferralCode != null && _referralDiscount > 0;
    final bool hasDryCleaning = cartItems.any((i) =>
            i.rateItem.name.toLowerCase().contains('dry clean') ||
            i.rateItem.category.toLowerCase().contains('dry clean')) ||
        _selected.any((s) => s.toLowerCase().contains('dry clean'));

    return Column(
      children: [
        // 1. Referral Code Application Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: hasApplied ? const Color(0xFFECFDF5) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: hasApplied ? const Color(0xFF10B981) : const Color(AppConfig.borderColor),
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: hasApplied
                          ? const Color(0xFF059669).withOpacity(0.12)
                          : const Color(AppConfig.primaryColor).withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.card_giftcard_rounded,
                      color: hasApplied ? const Color(0xFF059669) : const Color(AppConfig.primaryColor),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hasApplied ? 'Referral Code Applied!' : 'Have a Referral Code?',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            color: hasApplied ? const Color(0xFF065F46) : const Color(AppConfig.foregroundColor),
                          ),
                        ),
                        Text(
                          hasApplied
                              ? 'You saved ₹$_referralDiscount on your first order'
                              : 'Get flat ₹100 OFF on your first booking',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: hasApplied ? const Color(0xFF047857) : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (hasApplied)
                    IconButton(
                      onPressed: _removeReferralCode,
                      icon: const Icon(Icons.cancel_outlined, color: Colors.redAccent, size: 22),
                      tooltip: 'Remove',
                    ),
                ],
              ),
              if (!hasApplied) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _referralController,
                        textCapitalization: TextCapitalization.characters,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 1.2),
                        decoration: InputDecoration(
                          hintText: 'ENTER CODE (e.g. FRIEND100)',
                          hintStyle: TextStyle(
                            color: Colors.grey.shade400,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          isDense: true,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(AppConfig.borderColor)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(AppConfig.primaryColor), width: 1.8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _isValidatingReferral ? null : _validateAndApplyReferral,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(AppConfig.primaryColor),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        elevation: 0,
                      ),
                      child: _isValidatingReferral
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'APPLY',
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.8),
                            ),
                    ),
                  ],
                ),
                if (_referralMessage != null && !hasApplied) ...[
                  const SizedBox(height: 6),
                  Text(
                    _referralMessage!,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.red.shade700,
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),

        // 2. Dry Cleaning Referral Points Redemption Card (if customer has points)
        if (_customerWalletPoints > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _isRedeemingPoints ? const Color(0xFFEFF6FF) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _isRedeemingPoints ? const Color(0xFF3B82F6) : const Color(AppConfig.borderColor),
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _isRedeemingPoints
                            ? const Color(0xFF2563EB).withOpacity(0.12)
                            : Colors.amber.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.stars_rounded,
                        color: _isRedeemingPoints ? const Color(0xFF2563EB) : Colors.amber.shade800,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                "Dry Cleaning Points",
                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.purple.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: Colors.purple.shade200),
                                ),
                                child: Text(
                                  "$_customerWalletPoints Pts",
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.purple.shade700),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _isRedeemingPoints
                                ? "₹100 discount applied to Dry Cleaning"
                                : "Redeem 100 points for flat ₹100 OFF (Min. order ₹349)",
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _toggleRedeemPoints(cartItems, subtotal),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isRedeemingPoints ? Colors.red.shade50 : const Color(0xFF2563EB),
                        foregroundColor: _isRedeemingPoints ? Colors.red.shade700 : Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        elevation: 0,
                      ),
                      child: Text(
                        _isRedeemingPoints ? "REMOVE" : "REDEEM",
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                if (!hasDryCleaning || subtotal < 349) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFB45309)),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            "T&C: Minimum & maximum discount is fixed at 100 points (₹100) for Dry Cleaning orders of ₹349+.",
                            style: TextStyle(fontSize: 10.5, color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

