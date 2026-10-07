import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import '../config.dart';

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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Payment Info", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                      Row(
                        children: [
                          Text(
                            "Total: ₹${widget.order['total'] ?? '0'}",
                            style: GoogleFonts.plusJakartaSans(
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                              color: const Color(AppConfig.primaryColor),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => _showChangeFinalAmountDialog(context),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green.shade300),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.edit, size: 12, color: Colors.green.shade800),
                                  const SizedBox(width: 4),
                                  Text(
                                    "Edit Amount",
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.green.shade900,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
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
                              if (context.mounted) {
                                final photoSuccess = await _showPhotoUploadSheet(context, 'delivery', mandatory: true);
                                if (!photoSuccess) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Delivery proof photo is required to complete delivery."),
                                        backgroundColor: Colors.orange,
                                      ),
                                    );
                                  }
                                  return;
                                }
                              }
                              await widget.onUpdateStatus(orderId, "Delivered to Cx", paymentStatus: _paymentStatus, paymentMode: _paymentMode);
                              if (context.mounted) Navigator.pop(context);
                              return;
                            }

                            final verified = await _verifyPin(context, expectedPin, "Delivery");
                            if (verified) {
                              if (context.mounted) {
                                final photoSuccess = await _showPhotoUploadSheet(context, 'delivery', mandatory: true);
                                if (!photoSuccess) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Delivery proof photo is required to complete delivery."),
                                        backgroundColor: Colors.orange,
                                      ),
                                    );
                                  }
                                  return;
                                }
                              }
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

  Future<void> _showChangeFinalAmountDialog(BuildContext ctx) async {
    final currentTotal = (widget.order['total'] ?? 0).toString();
    final amountController = TextEditingController(text: currentTotal == '0' ? '' : currentTotal);
    final reasonController = TextEditingController();
    bool confirmedByManager = false;
    bool isSaving = false;

    await showDialog(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (innerCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.currency_rupee_rounded, color: Color(AppConfig.primaryColor), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Change Final Amount",
                          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        Text(
                          "Order #${widget.order['id']}",
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.shield_outlined, color: Colors.amber.shade900, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Any price change requires verbal or written confirmation from the Store Manager before updating.",
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "New Final Amount (₹)",
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey.shade800),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      autofocus: true,
                      style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.currency_rupee_rounded, color: Color(AppConfig.primaryColor)),
                        hintText: "Enter final amount (e.g. 150)",
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, color: Colors.grey.shade400),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      "Reason / Note (Optional)",
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey.shade800),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: reasonController,
                      style: GoogleFonts.plusJakartaSans(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: "e.g. Garments quantity updated, approved by manager",
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, color: Colors.grey.shade400),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: confirmedByManager ? Colors.green.shade50 : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: confirmedByManager ? Colors.green.shade400 : Colors.grey.shade300,
                        ),
                      ),
                      child: CheckboxListTile(
                        value: confirmedByManager,
                        activeColor: Colors.green.shade700,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        title: Text(
                          "I confirm manager approved this amount",
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: confirmedByManager ? Colors.green.shade900 : Colors.black87,
                          ),
                        ),
                        subtitle: Text(
                          "Confirmation verified with branch manager",
                          style: GoogleFonts.plusJakartaSans(fontSize: 10, color: Colors.grey.shade600),
                        ),
                        onChanged: (val) {
                          setDialogState(() {
                            confirmedByManager = val ?? false;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(dialogCtx),
                  child: Text(
                    "CANCEL",
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                  ),
                ),
                ElevatedButton(
                  onPressed: (!confirmedByManager || isSaving)
                      ? null
                      : () async {
                          final parsedAmount = double.tryParse(amountController.text.trim());
                          if (parsedAmount == null || parsedAmount < 0) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text("Please enter a valid amount")),
                            );
                            return;
                          }

                          setDialogState(() => isSaving = true);
                          try {
                            final prefs = await SharedPreferences.getInstance();
                            final token = prefs.getString('rider_token');
                            final riderName = prefs.getString('rider_name') ?? 'Rider';
                            final orderId = widget.order['id'];

                            final reason = reasonController.text.trim();
                            final note = reason.isNotEmpty 
                                ? "$reason (Confirmed by Manager)" 
                                : "Amount updated by rider $riderName (Confirmed by Manager)";

                            final response = await http.put(
                              Uri.parse('${AppConfig.baseUrl}/api/orders/$orderId'),
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer $token',
                              },
                              body: jsonEncode({
                                'total': parsedAmount,
                                'subtotal': parsedAmount,
                                'managerConfirmedAmount': true,
                                'amountChangeReason': note,
                              }),
                            );

                            if (response.statusCode == 200) {
                              if (mounted) {
                                setState(() {
                                  widget.order['total'] = parsedAmount;
                                  widget.order['subtotal'] = parsedAmount;
                                });
                                Navigator.pop(dialogCtx);
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(
                                    content: Row(
                                      children: [
                                        const Icon(Icons.check_circle, color: Colors.white),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            "Final amount updated to ₹${parsedAmount.toStringAsFixed(0)} (Manager Confirmed)",
                                            style: const TextStyle(fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    backgroundColor: Colors.green.shade700,
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  ),
                                );
                              }
                            } else {
                              throw Exception("Failed: ${response.body}");
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                SnackBar(content: Text("Error updating amount: $e"), backgroundColor: Colors.red),
                              );
                            }
                          } finally {
                            if (innerCtx.mounted) {
                              setDialogState(() => isSaving = false);
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(AppConfig.primaryColor),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    disabledForegroundColor: Colors.grey.shade500,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  ),
                  child: isSaving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          "SAVE AMOUNT",
                          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900),
                        ),
                ),
              ],
            );
          },
        );
      },
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

  // ─── Photo Upload Helpers ────────────────────────────────────────────────

  Future<bool> _showPhotoUploadSheet(BuildContext ctx, String photoType, {bool mandatory = true}) async {
    final picker = ImagePicker();
    XFile? pickedFile;
    bool uploadSuccess = false;

    await showModalBottomSheet(
      context: ctx,
      isDismissible: !mandatory,
      enableDrag: !mandatory,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      backgroundColor: Colors.white,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (innerCtx, setSheetState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 48, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.check_circle_rounded,
                            color: Color(AppConfig.primaryColor), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Delivery Proof Photo',
                            style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            mandatory ? 'Required to complete delivery' : 'Optional — helps resolve disputes',
                            style: TextStyle(fontSize: 12, color: mandatory ? Colors.red[600] : Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (pickedFile != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: kIsWeb
                          ? Image.network(pickedFile!.path, height: 180, width: double.infinity, fit: BoxFit.cover)
                          : Image.file(File(pickedFile!.path), height: 180, width: double.infinity, fit: BoxFit.cover),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final f = await picker.pickImage(source: ImageSource.camera, imageQuality: 60, maxWidth: 1024);
                              if (f != null) setSheetState(() => pickedFile = f);
                            },
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Retake'),
                            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              final success = await _uploadPhoto(pickedFile!, photoType);
                              uploadSuccess = success;
                              if (innerCtx.mounted) Navigator.pop(innerCtx);
                            },
                            icon: const Icon(Icons.cloud_upload_rounded, size: 18),
                            label: const Text('Upload & Confirm'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(AppConfig.primaryColor),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(0, 50),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    Row(
                      children: [
                        Expanded(
                          child: _PhotoSourceButton(
                            icon: Icons.camera_alt_rounded,
                            label: 'Camera',
                            onTap: () async {
                              final f = await picker.pickImage(source: ImageSource.camera, imageQuality: 60, maxWidth: 1024);
                              if (f != null) setSheetState(() => pickedFile = f);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _PhotoSourceButton(
                            icon: Icons.photo_library_rounded,
                            label: 'Gallery',
                            onTap: () async {
                              final f = await picker.pickImage(source: ImageSource.gallery, imageQuality: 60, maxWidth: 1024);
                              if (f != null) setSheetState(() => pickedFile = f);
                            },
                          ),
                        ),
                      ],
                    ),
                    if (!mandatory) ...[
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () {
                          uploadSuccess = true;
                          Navigator.pop(innerCtx);
                        },
                        child: Text('Skip for now', style: TextStyle(color: Colors.grey[500], fontSize: 13)),
                      ),
                    ],
                  ],
                ],
              ),
            );
          },
        );
      },
    );
    return uploadSuccess;
  }

  Future<bool> _uploadPhoto(XFile file, String photoType) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      final orderId = widget.order['id']?.toString() ?? '';

      final Uint8List bytes = await file.readAsBytes();
      final String base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      final res = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/orders/$orderId/photo'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({'type': photoType, 'photo': base64Image}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}

class _PhotoSourceButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PhotoSourceButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 36, color: const Color(AppConfig.primaryColor)),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF1E293B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
