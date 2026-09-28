import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'active_delivery_screen.dart';
import 'price_list_screen.dart';
import '../../config.dart';
import 'package:flutter/foundation.dart';

class OrderDetailsScreen extends StatefulWidget {
  final dynamic order;
  final Function(String, String, {String? paymentStatus, String? paymentMode}) onUpdateStatus;
  const OrderDetailsScreen({super.key, required this.order, required this.onUpdateStatus});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  late String currentStatus;
  bool arrived = false;
  Map<String, int> _itemsMap = {};
  bool _itemsExpanded = true;

  @override
  void initState() {
    super.initState();
    currentStatus = widget.order['status'] ?? 'Pending';
    _parseServices();
  }

  void _parseServices() {
    _itemsMap.clear();
    if (widget.order != null && widget.order['services'] != null) {
      final services = widget.order['services'];
      List<String> serviceStrings = [];
      if (services is List) {
        serviceStrings = services.map((s) => s.toString()).toList();
      } else if (services is String) {
        serviceStrings = services.split(',').map((s) => s.trim()).toList();
      }
      for (var s in serviceStrings) {
        final match = RegExp(r'^(\d+)\s*x\s*(.*)$').firstMatch(s);
        if (match != null) {
          final qty = int.tryParse(match.group(1) ?? '0') ?? 0;
          final name = match.group(2)?.trim() ?? '';
          if (qty > 0 && name.isNotEmpty) {
            _itemsMap[name] = qty;
          }
        } else {
          if (s.trim().isNotEmpty) {
            _itemsMap[s.trim()] = 1;
          }
        }
      }
    }
  }



  void _showIssueReportSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      backgroundColor: Colors.white,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 48,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                "Report Pickup/Delivery Issue",
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: const Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Select the appropriate issue option below. The store manager and customer will be notified instantly.",
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFF6B7280),
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              
              // Option 1: Unanswered Call
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.phone_missed_rounded, color: Colors.amber.shade800),
                ),
                title: Text(
                  "Customer Call Unanswered",
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: const Color(0xFF111827),
                  ),
                ),
                subtitle: const Text("Flag the customer as unreachable"),
                onTap: () async {
                  Navigator.pop(context);
                  final orderId = widget.order['id']?.toString() ?? "";
                  await widget.onUpdateStatus(orderId, "Customer Unreachable");
                  setState(() {
                    currentStatus = "Customer Unreachable";
                  });
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Order status marked as Customer Unreachable"),
                        backgroundColor: Colors.amber,
                      ),
                    );
                    Navigator.pop(context);
                  }
                },
              ),
              const SizedBox(height: 12),
              
              // Option 2: Cancel Order
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.cancel_rounded, color: Colors.red),
                ),
                title: Text(
                  "Cancel Entire Order",
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: const Color(0xFF111827),
                  ),
                ),
                subtitle: const Text("Permanently cancel the laundry order"),
                onTap: () async {
                  Navigator.pop(context);
                  // Confirm dialog
                  bool? confirm = await showDialog<bool>(
                    context: context,
                    builder: (c) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      title: const Text("Confirm Cancellation"),
                      content: const Text("Are you absolutely sure you want to cancel this order? This action cannot be undone."),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: const Text("NO", style: TextStyle(color: Colors.grey)),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: const Text("YES, CANCEL", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    final orderId = widget.order['id']?.toString() ?? "";
                    await widget.onUpdateStatus(orderId, "Cancelled");
                    setState(() {
                      currentStatus = "Cancelled";
                    });
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Order has been successfully cancelled"),
                          backgroundColor: Colors.red,
                        ),
                      );
                      Navigator.pop(context);
                    }
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  ll.LatLng _getCoordinates(String address) {
    final lower = address.toLowerCase();
    if (lower.contains("gulmohar")) {
      return const ll.LatLng(23.1979, 77.4518);
    } else if (lower.contains("ayodhya")) {
      return const ll.LatLng(23.2684, 77.4646);
    }
    return const ll.LatLng(23.2599, 77.4126);
  }

  @override
  Widget build(BuildContext context) {
    final statusLower = currentStatus.toLowerCase();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF111827)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          "ACTIVE TASK DETAILS",
          style: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF111827),
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(AppConfig.primaryColor), // Brand Primary
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                currentStatus.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order ID & Summary Panel
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827), // Deep Rapido Theme
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "ORDER REFERENCE",
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey.shade400,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "#${widget.order['id']}",
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: const Color(AppConfig.primaryColor), // Brand Primary
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        "TOTAL ITEMS",
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey.shade400,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${_itemsMap.values.fold(0, (sum, q) => sum + q)} Items",
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Rapido Step-by-Step Live Stepper
            _buildRapidoStepper(statusLower),
            const SizedBox(height: 16),

            // Dropdown Expandable Items List
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade100),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.01),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.shopping_bag_outlined, color: Color(AppConfig.primaryColor)),
                    title: Text(
                      "Items List (${_itemsMap.values.fold(0, (sum, q) => sum + q)} Clothes)",
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: const Color(0xFF111827),
                      ),
                    ),
                    trailing: Icon(
                      _itemsExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: Colors.grey,
                    ),
                    onTap: () {
                      setState(() {
                        _itemsExpanded = !_itemsExpanded;
                      });
                    },
                  ),
                  if (_itemsExpanded) ...[
                    const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          if (_itemsMap.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 20),
                              child: Text(
                                "No items currently added",
                                style: GoogleFonts.plusJakartaSans(
                                  color: Colors.grey.shade400,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ..._itemsMap.entries.map((entry) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      entry.key,
                                      style: GoogleFonts.plusJakartaSans(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: const Color(0xFF111827),
                                      ),
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          "${entry.value}x",
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w900,
                                            fontSize: 14,
                                            color: const Color(AppConfig.primaryColor),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          const SizedBox(height: 8),
                          const Divider(),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "Total Amount",
                                style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              Text(
                                "₹${widget.order['total'] ?? '0'}",
                                style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                  color: const Color(AppConfig.primaryColor),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (c) => PriceListScreen(
                                    order: widget.order,
                                    onUpdateStatus: widget.onUpdateStatus,
                                  ),
                                ),
                              );
                              setState(() {
                                _parseServices();
                              });
                            },
                            icon: const Icon(Icons.edit_note_rounded, size: 18),
                            label: const Text("ADD / EDIT CATALOG ITEMS"),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(AppConfig.primaryColor).withOpacity(0.1),
                              foregroundColor: const Color(AppConfig.primaryColor),
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              minimumSize: const Size(double.infinity, 44),
                              textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Customer Contact Panel
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: Colors.grey.shade100),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(AppConfig.primaryColor).withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person_rounded, color: Color(AppConfig.primaryColor), size: 26),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.order['name'] ?? "Customer",
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF111827),
                          ),
                        ),
                        Text(
                          "Priority Gold Member",
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.grey.shade500,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () async {
                          final url = Uri.parse("tel:${widget.order['phone']}");
                          if (await canLaunchUrl(url)) {
                            await launchUrl(url);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(Icons.call_rounded, color: Color(0xFF111827), size: 22),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: _showIssueReportSheet,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.red.shade100),
                          ),
                          child: const Icon(Icons.report_problem_rounded, color: Colors.red, size: 22),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Map and Navigation Box
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: Colors.grey.shade100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Customer Address",
                              style: GoogleFonts.plusJakartaSans(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.order['address'] ?? "No Address",
                              style: GoogleFonts.plusJakartaSans(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: const Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Live Dynamic Customer Location Map Preview
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 160,
                      width: double.infinity,
                      child: Stack(
                        children: [
                          FlutterMap(
                            options: MapOptions(
                              initialCenter: _getCoordinates(widget.order['address'] ?? ""),
                              initialZoom: 15.0,
                              interactionOptions: const InteractionOptions(flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag),
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.laundrybasket.app',
                              ),
                              MarkerLayer(
                                markers: [
                                  Marker(
                                    point: _getCoordinates(widget.order['address'] ?? ""),
                                    width: 44,
                                    height: 44,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.red.shade600,
                                        shape: BoxShape.circle,
                                        boxShadow: const [
                                          BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 3)),
                                        ],
                                      ),
                                      child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 26),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          Positioned(
                            top: 10,
                            right: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.location_pin, color: Colors.white, size: 12),
                                  const SizedBox(width: 4),
                                  Text(
                                    "Customer Destination",
                                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse("https://www.google.com/maps/search/?api=1&query=${widget.order['address']}");
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url, mode: LaunchMode.externalApplication);
                      }
                    },
                    icon: const Icon(Icons.near_me_rounded, size: 18),
                    label: const Text("NAVIGATE VIA GOOGLE MAPS"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AppConfig.primaryColor),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Services Section
            Text(
              "SERVICES REQUESTED",
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                color: Colors.grey.shade500,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            if (widget.order['services'] != null && widget.order['services'] is List && widget.order['services'].isNotEmpty)
              ...List.generate(widget.order['services'].length, (index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _serviceItem(Icons.local_laundry_service_rounded, widget.order['services'][index].toString(), "Standard Service", true),
                );
              })
            else if (widget.order['services'] != null && widget.order['services'] is String && widget.order['services'].toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _serviceItem(Icons.local_laundry_service_rounded, widget.order['services'].toString(), "Standard Service", true),
              )
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.orange.shade800),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "Manual Store Order - Items and pricing to be customized by the Rider during arrival.",
                        style: TextStyle(
                          color: Colors.orange.shade900,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // Driver Instructions Note
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.sticky_note_2_rounded, color: Color(0xFF111827), size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Special Delivery Note",
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF111827),
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.order['note'] ?? "Customer requested contactless pickup. Please call upon arrival at the gate.",
                          style: const TextStyle(color: Color(0xFF4B5563), fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 120),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, -6),
            ),
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // STEP 1: Pending -> Slide to start journey
            if (statusLower == 'pending' || statusLower == 'assigned')
              SwipeToConfirmButton(
                text: "SLIDE TO START JOURNEY",
                onSwipe: () async {
                  final orderId = widget.order['id']?.toString() ?? "";
                  await widget.onUpdateStatus(orderId, "Out for Pickup");
                  setState(() {
                    currentStatus = "Out for Pickup";
                    arrived = false;
                  });
                  // Auto launch maps
                  final url = Uri.parse("https://www.google.com/maps/search/?api=1&query=${widget.order['address']}");
                  if (await canLaunchUrl(url)) {
                    await launchUrl(url, mode: LaunchMode.externalApplication);
                  }
                },
              ),

            // STEP 2: En Route -> Click to Arrive
            if (statusLower == 'out for pickup' && !arrived)
              Column(
                children: [
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        arrived = true;
                      });
                    },
                    icon: const Icon(Icons.pin_drop_rounded, size: 22),
                    label: const Text("📍 ARRIVED AT CUSTOMER LOCATION"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AppConfig.primaryColor), // Brand Primary
                      foregroundColor: Colors.white, // Black
                      minimumSize: const Size(double.infinity, 60),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      textStyle: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),

            // STEP 3: Arrived -> Update items or PIN input to complete pickup
            if (statusLower == 'out for pickup' && arrived)
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (c) => PriceListScreen(
                                  order: widget.order,
                                  onUpdateStatus: widget.onUpdateStatus,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.edit_note_rounded, size: 20),
                          label: const Text("EDIT ITEMS"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF3F4F6),
                            foregroundColor: const Color(0xFF111827),
                            minimumSize: const Size(double.infinity, 54),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            textStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            final orderId = widget.order['id']?.toString() ?? "";
                            final source = (widget.order['source'] ?? '').toString().toLowerCase();
                            final isWalkInOrWhatsapp = source.contains('walk-in') || source.contains('whatsapp');
                            final expectedPin = widget.order['pickupCode']?.toString();

                            // Walk-in and WhatsApp orders do not require OTP
                            if (isWalkInOrWhatsapp || expectedPin == null || expectedPin.trim().isEmpty) {
                              await widget.onUpdateStatus(orderId, "Pickup done");
                              setState(() {
                                currentStatus = "Pickup done";
                              });
                              return;
                            }

                            final verified = await _verifyPin(context, expectedPin, "Pickup");
                            if (verified) {
                              await widget.onUpdateStatus(orderId, "Pickup done");
                              setState(() {
                                currentStatus = "Pickup done";
                              });
                            }
                          },
                          icon: Icon(
                            ((widget.order['source'] ?? '').toString().toLowerCase().contains('walk-in') ||
                             (widget.order['source'] ?? '').toString().toLowerCase().contains('whatsapp') ||
                             widget.order['pickupCode'] == null) ? Icons.check_circle_outline_rounded : Icons.vpn_key_rounded,
                            size: 18,
                          ),
                          label: Text(
                            ((widget.order['source'] ?? '').toString().toLowerCase().contains('walk-in') ||
                             (widget.order['source'] ?? '').toString().toLowerCase().contains('whatsapp') ||
                             widget.order['pickupCode'] == null) ? "CONFIRM PICKUP" : "VERIFY PIN",
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF111827),
                            foregroundColor: const Color(AppConfig.primaryColor),
                            minimumSize: const Size(double.infinity, 54),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            textStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

            // STEP 4: Pickup Completed -> Slide to confirm store drop-off
            if (statusLower == 'pickup done')
              Column(
                children: [
                  ElevatedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse("https://www.google.com/maps/search/?api=1&query=Laundry+Basket+Store");
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url, mode: LaunchMode.externalApplication);
                      }
                    },
                    icon: const Icon(Icons.store_rounded),
                    label: const Text("NAVIGATE TO LAUNDRY STORE"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AppConfig.primaryColor),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 54),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SwipeToConfirmButton(
                    text: "SLIDE TO DELIVER AT STORE",
                    baseColor: const Color(0xFF10B981), // Green Accent for Success Delivery
                    onSwipe: () async {
                      final orderId = widget.order['id']?.toString() ?? "";
                      final source = (widget.order['source'] ?? '').toString().toLowerCase();
                      final isWalkInOrWhatsapp = source.contains('walk-in') || source.contains('whatsapp');
                      final expectedPin = widget.order['deliveryCode']?.toString();

                      // Walk-in and WhatsApp orders do not require OTP for store delivery
                      if (isWalkInOrWhatsapp || expectedPin == null || expectedPin.trim().isEmpty) {
                        await widget.onUpdateStatus(orderId, "Delivered at store");
                        if (context.mounted) Navigator.pop(context);
                        return;
                      }

                      final verified = await _verifyPin(context, expectedPin, "Store Delivery");
                      if (verified) {
                        await widget.onUpdateStatus(orderId, "Delivered at store");
                        if (context.mounted) Navigator.pop(context);
                      } else {
                        setState(() {});
                      }
                    },
                  ),
                ],
              ),

            // STEP 5: Delivery -> Start final drop-off
            if (statusLower == 'out for delivery' || statusLower == 'ready')
              ElevatedButton.icon(
                onPressed: () async {
                  if (context.mounted) {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (c) => ActiveDeliveryScreen(
                          order: widget.order,
                          onUpdateStatus: widget.onUpdateStatus,
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.navigation_rounded),
                label: const Text("START DELIVERY JOURNEY"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF111827),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 60),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  textStyle: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRapidoStepper(String statusLower) {
    int activeIndex = 0;
    if (statusLower == 'out for pickup') {
      activeIndex = 1;
    } else if (statusLower == 'pickup done') {
      activeIndex = 2;
    } else if (statusLower == 'delivered at store') {
      activeIndex = 3;
    } else if (statusLower == 'ready' || statusLower == 'out for delivery') {
      activeIndex = 3;
    }

    final steps = [
      {'title': 'Assigned', 'icon': Icons.assignment_turned_in_rounded},
      {'title': 'En Route', 'icon': Icons.motorcycle_rounded},
      {'title': 'Arrived', 'icon': Icons.pin_drop_rounded},
      {'title': 'Collected', 'icon': Icons.local_mall_rounded},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827), // Rapido Black
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(steps.length, (index) {
              final step = steps[index];
              final isActive = index <= activeIndex;
              final isCurrent = index == activeIndex;
              final stepColor = isCurrent
                  ? const Color(AppConfig.primaryColor) // Brand Primary
                  : (isActive ? Colors.white : Colors.grey.shade600);

              return Expanded(
                child: Column(
                  children: [
                    Icon(
                      step['icon'] as IconData,
                      color: stepColor,
                      size: 22,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      step['title'] as String,
                      style: GoogleFonts.plusJakartaSans(
                        color: stepColor,
                        fontSize: 10,
                        fontWeight: isCurrent ? FontWeight.w900 : FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: (activeIndex + 1) / steps.length,
              backgroundColor: Colors.grey.shade800,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(AppConfig.primaryColor)),
              minHeight: 5,
            ),
          ),
        ],
      ),
    );
  }

  Future<bool> _verifyPin(BuildContext context, String? expectedPin, String actionType) async {
    final pinToVerify = (expectedPin == null || expectedPin.trim().isEmpty) ? "1234" : expectedPin.trim();
    return await _showPinVerificationDialog(context, pinToVerify, actionType);
  }

  Future<bool> _showPinVerificationDialog(BuildContext context, String expectedPin, String actionType) async {
    final controller = TextEditingController();
    bool? verified = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          backgroundColor: Colors.white,
          title: Row(
            children: [
              const Icon(Icons.shield_outlined, color: Color(0xFF111827), size: 28),
              const SizedBox(width: 12),
              Text(
                "Security Check",
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: const Color(0xFF111827),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Ask the ${actionType == 'Store Delivery' ? 'Store Manager' : 'Customer'} for the 4-digit verification PIN to confirm this step:",
                style: GoogleFonts.plusJakartaSans(color: const Color(0xFF4B5563), fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                maxLength: 4,
                obscureText: true,
                obscuringCharacter: '●',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 10,
                  color: const Color(0xFF111827),
                ),
                decoration: InputDecoration(
                  counterText: "",
                  hintText: "••••",
                  hintStyle: const TextStyle(letterSpacing: 10),
                  filled: true,
                  fillColor: const Color(0xFFF3F4F6),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text("CANCEL", style: GoogleFonts.plusJakartaSans(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () {
                if (controller.text == expectedPin) {
                  Navigator.pop(context, true);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Incorrect PIN. Please try again."),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF111827),
                foregroundColor: const Color(AppConfig.primaryColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("VERIFY"),
            ),
          ],
        );
      },
    );
    return verified ?? false;
  }

  Widget _serviceItem(IconData icon, String title, String subtitle, bool done) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(AppConfig.primaryColor).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(AppConfig.primaryColor)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF111827))),
                Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
              ],
            ),
          ),
          Icon(
            done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            color: done ? Colors.green : Colors.grey.shade300,
          ),
        ],
      ),
    );
  }
}

// Custom Rapido-Style Swipe Slider Button
class SwipeToConfirmButton extends StatefulWidget {
  final String text;
  final VoidCallback onSwipe;
  final Color baseColor;
  final Color accentColor;

  const SwipeToConfirmButton({
    Key? key,
    required this.text,
    required this.onSwipe,
    this.baseColor = const Color(AppConfig.primaryColor), // Brand Primary
    this.accentColor = const Color(0xFF111827), // Deep Charcoal
  }) : super(key: key);

  @override
  _SwipeToConfirmButtonState createState() => _SwipeToConfirmButtonState();
}

class _SwipeToConfirmButtonState extends State<SwipeToConfirmButton> {
  double _position = 0.0;
  bool _completed = false;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double maxPosition = constraints.maxWidth - 60; // 52px width + margin
        return Container(
          width: double.infinity,
          height: 60,
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: widget.accentColor,
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              Center(
                child: Text(
                  widget.text,
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              Positioned(
                left: _position,
                top: 0,
                bottom: 0,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    if (_completed) return;
                    setState(() {
                      _position += details.delta.dx;
                      if (_position < 0) _position = 0;
                      if (_position > maxPosition) _position = maxPosition;
                    });
                  },
                  onHorizontalDragEnd: (details) {
                    if (_completed) return;
                    if (_position >= maxPosition * 0.85) {
                      setState(() {
                        _position = maxPosition;
                        _completed = true;
                      });
                      widget.onSwipe();
                    } else {
                      setState(() {
                        _position = 0.0;
                      });
                    }
                  },
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: widget.baseColor,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: widget.accentColor,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
