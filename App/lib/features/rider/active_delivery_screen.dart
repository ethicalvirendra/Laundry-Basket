import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config.dart';

class ActiveDeliveryScreen extends StatefulWidget {
  final dynamic order;
  final Function(String, String, {String? paymentStatus, String? paymentMode}) onUpdateStatus;
  const ActiveDeliveryScreen({super.key, required this.order, required this.onUpdateStatus});

  @override
  State<ActiveDeliveryScreen> createState() => _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends State<ActiveDeliveryScreen> {
  String _paymentStatus = 'Pending';
  String? _paymentMode;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131B2E),
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              image: DecorationImage(image: NetworkImage("https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=60"), fit: BoxFit.cover, opacity: 0.6),
            ),
          ),
          Positioned(
            top: 60, left: 24, right: 24,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: const Color(AppConfig.primaryColor), borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 30, offset: const Offset(0, 15))]),
              child: Row(
                children: [
                  const Icon(Icons.navigation_rounded, color: Colors.white, size: 32),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("450 ft • Turn Right", style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                        const Text("onto Market Street", style: TextStyle(color: Colors.white70)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 40, left: 24, right: 24,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 40, offset: const Offset(0, 20))]),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(width: 50, height: 50, decoration: BoxDecoration(color: const Color(AppConfig.primaryColor).withOpacity(0.1), shape: BoxShape.circle), child: const Icon(Icons.person, color: Color(AppConfig.primaryColor))),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(widget.order['name'] ?? "James", style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold)),
                          const Text("Est. Arrival: 4:22 PM", style: TextStyle(color: Colors.grey)),
                        ]),
                      ),
                      Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), shape: BoxShape.circle), child: const Icon(Icons.call, color: Colors.green)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text("Payment Info", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text("Pending", style: TextStyle(fontSize: 14)),
                          value: "Pending",
                          groupValue: _paymentStatus,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (val) => setState(() { _paymentStatus = val!; _paymentMode = null; }),
                        ),
                      ),
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text("Received", style: TextStyle(fontSize: 14)),
                          value: "Received",
                          groupValue: _paymentStatus,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (val) => setState(() { _paymentStatus = val!; _paymentMode = "Cash"; }),
                        ),
                      ),
                    ],
                  ),
                  if (_paymentStatus == 'Received')
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: ChoiceChip(
                              label: const Text("Cash"),
                              selected: _paymentMode == 'Cash',
                              onSelected: (val) => setState(() => _paymentMode = 'Cash'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ChoiceChip(
                              label: const Text("Online QR"),
                              selected: _paymentMode == 'Online QR',
                              onSelected: (val) => setState(() => _paymentMode = 'Online QR'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 56), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                          child: const Text("CANCEL"),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            final orderId = widget.order['id']?.toString() ?? "";
                            final source = (widget.order['source'] ?? '').toString().toLowerCase();
                            final isWalkInOrWhatsapp = source.contains('walk-in') || source.contains('whatsapp');
                            final expectedPin = widget.order['deliveryCode']?.toString();

                            // Walk-in and WhatsApp orders do not require OTP for delivery
                            if (isWalkInOrWhatsapp || expectedPin == null || expectedPin.trim().isEmpty) {
                              await widget.onUpdateStatus(orderId, "Delivered to Cx", paymentStatus: _paymentStatus, paymentMode: _paymentMode);
                              if (context.mounted) Navigator.pop(context);
                              return;
                            }

                            final verified = await _verifyPin(context, expectedPin, "Delivery");
                            if (verified) {
                              await widget.onUpdateStatus(orderId, "Delivered to Cx", paymentStatus: _paymentStatus, paymentMode: _paymentMode);
                              if (context.mounted) Navigator.pop(context);
                            }
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConfig.primaryColor), foregroundColor: Colors.white, minimumSize: const Size(0, 56), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                          child: const Text("DELIVERED"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
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
              const Icon(Icons.shield_outlined, color: Color(AppConfig.primaryColor), size: 28),
              const SizedBox(width: 12),
              Text(
                "Security Verification",
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: const Color(0xFF131B2E),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Please enter the 4-digit $actionType PIN provided by the customer to verify this transaction:",
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
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
                  letterSpacing: 8,
                  color: const Color(0xFF131B2E),
                ),
                decoration: InputDecoration(
                  counterText: "",
                  hintText: "••••",
                  hintStyle: const TextStyle(letterSpacing: 8),
                  filled: true,
                  fillColor: const Color(0xFFF1F5F9),
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
              child: const Text("CANCEL", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () {
                if (controller.text == expectedPin) {
                  Navigator.pop(context, true);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Incorrect PIN. Please check with customer."),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(AppConfig.primaryColor),
                foregroundColor: Colors.white,
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
}
