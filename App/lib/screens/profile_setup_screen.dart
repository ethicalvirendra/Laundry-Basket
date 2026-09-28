import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import '../config.dart';
import '../widgets/common.dart';
import '../services/telemetry_service.dart';
import 'main_navigation.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  String _accountType = 'Residential';
  String _sourceSegment = 'AP';
  String? _profilePictureUrl;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    Telemetry.trackScreen('profile_setup');
    _loadInitialValues();
  }

  Future<void> _loadInitialValues() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _nameController.text = prefs.getString('customer_name') ?? '';
      _phoneController.text = prefs.getString('customer_phone') ?? '';
      _addressController.text = prefs.getString('customer_address') ?? '';
      _profilePictureUrl = prefs.getString('customer_profile_picture');
      _accountType = prefs.getString('customer_account_type') ?? 'Residential';
      _sourceSegment = prefs.getString('customer_source_segment') ?? 'AP';
    });
  }

  Future<void> _handleSaveProfile() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final address = _addressController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your name')),
      );
      return;
    }

    if (phone.isEmpty || phone.length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit mobile number')),
      );
      return;
    }

    if (address.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your address')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('customer_token');
      
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/customer/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'name': name,
          'phone': phone,
          'address': address,
          'accountType': _accountType,
          'sourceSegment': _sourceSegment,
          if (_profilePictureUrl != null && _profilePictureUrl!.isNotEmpty)
            'profilePicture': _profilePictureUrl,
        }),
      );

      if (response.statusCode == 200) {
        await prefs.setString('customer_name', name);
        await prefs.setString('customer_phone', phone);
        await prefs.setString('customer_address', address);
        await prefs.setString('customer_account_type', _accountType);
        await prefs.setString('customer_source_segment', _sourceSegment);
        if (_profilePictureUrl != null && _profilePictureUrl!.isNotEmpty) {
          await prefs.setString('customer_profile_picture', _profilePictureUrl!);
        }
        
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainNavigation()),
        );
      } else {
        final errorData = jsonDecode(response.body);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorData['error'] ?? 'Failed to update profile')),
        );
      }
    } catch (e) {
      debugPrint('Profile setup error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('An error occurred. Please try again.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _capsuleField({
    required TextEditingController controller,
    required String hint,
    bool isPhone = false,
    int maxLines = 1,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(AppConfig.primaryColor),
        borderRadius: BorderRadius.circular(maxLines > 1 ? 24 : 100),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: TextField(
        controller: controller,
        keyboardType: isPhone
            ? TextInputType.phone
            : (maxLines > 1 ? TextInputType.multiline : TextInputType.text),
        textAlign: maxLines > 1 ? TextAlign.left : TextAlign.center,
        maxLines: maxLines,
        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(vertical: maxLines > 1 ? 16 : 20),
        ),
      ),
    );
  }

  Widget _accountTypeSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(AppConfig.primaryColor),
        borderRadius: BorderRadius.circular(100),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _accountType,
          dropdownColor: const Color(AppConfig.primaryColor),
          icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
          isExpanded: true,
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
          items: ['Residential', 'Business'].map((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Center(child: Text(value)),
            );
          }).toList(),
          onChanged: (newValue) {
            setState(() {
              _accountType = newValue!;
            });
          },
        ),
      ),
    );
  }

  Widget _sourceSegmentSelector() {
    final segments = [
      {'code': 'AP', 'title': '📱 AP - App Directly'},
      {'code': 'NP', 'title': '📰 NP - NewsPaper'},
      {'code': 'SM', 'title': '📱 SM - Social Media'},
      {'code': 'RF', 'title': '👥 RF - Reference (Friend/Family)'},
      {'code': 'WS', 'title': '🌐 WS - Website Directly'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(AppConfig.primaryColor),
        borderRadius: BorderRadius.circular(100),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _sourceSegment,
          dropdownColor: const Color(AppConfig.primaryColor),
          icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
          isExpanded: true,
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
          items: segments.map((item) {
            return DropdownMenuItem<String>(
              value: item['code'],
              child: Center(
                child: Text(
                  item['title']!,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            );
          }).toList(),
          onChanged: (newValue) {
            if (newValue != null) {
              setState(() {
                _sourceSegment = newValue;
              });
            }
          },
        ),
      ),
    );
  }

  void _showEditProfilePictureDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Update Profile Picture', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Color(0xFFF5F8FF), shape: BoxShape.circle),
                  child: Icon(Icons.photo_library, color: Color(AppConfig.primaryColor)),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () async {
                  Navigator.pop(context);
                  final picker = ImagePicker();
                  final XFile? image = await picker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 512,
                    maxHeight: 512,
                    imageQuality: 70,
                  );
                  if (image != null) {
                    final bytes = await image.readAsBytes();
                    final base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";
                    setState(() {
                      _profilePictureUrl = base64Image;
                    });
                  }
                },
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Color(0xFFFEE2E2), shape: BoxShape.circle),
                  child: Icon(Icons.delete_outline, color: Colors.red),
                ),
                title: const Text('Remove Photo', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _profilePictureUrl = null;
                  });
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Column(
                children: [
                  const SizedBox(height: 60),
                  const Center(child: AppLogo(height: 120)),
                  const SizedBox(height: 40),
                  Text(
                    'Welcome!',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Complete your profile',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 32),
                  GestureDetector(
                    onTap: _showEditProfilePictureDialog,
                    child: Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: const Color(AppConfig.primaryColor).withOpacity(0.2), blurRadius: 40, spreadRadius: 10),
                            ],
                            border: Border.all(color: Colors.white, width: 4),
                          ),
                          child: ClipOval(
                            child: _profilePictureUrl != null && _profilePictureUrl!.isNotEmpty
                                ? (_profilePictureUrl!.startsWith('data:image')
                                    ? (() {
                                        try {
                                          final bytes = base64Decode(_profilePictureUrl!.split(',').last);
                                          return Image.memory(
                                            bytes,
                                            width: 100,
                                            height: 100,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) => Container(
                                              width: 100,
                                              height: 100,
                                              color: const Color(AppConfig.primaryColor),
                                              child: const Icon(Icons.person, color: Colors.white, size: 50),
                                            ),
                                          );
                                        } catch (e) {
                                          return Container(
                                            width: 100,
                                            height: 100,
                                            color: const Color(AppConfig.primaryColor),
                                            child: const Icon(Icons.person, color: Colors.white, size: 50),
                                          );
                                        }
                                      })()
                                    : Image.network(
                                        _profilePictureUrl!,
                                        width: 100,
                                        height: 100,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          width: 100,
                                          height: 100,
                                          color: const Color(AppConfig.primaryColor),
                                          child: const Icon(Icons.person, color: Colors.white, size: 50),
                                        ),
                                      ))
                                : Container(
                                    width: 100,
                                    height: 100,
                                    color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                                    child: const Icon(Icons.person, color: Color(AppConfig.primaryColor), size: 50),
                                  ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: Color(AppConfig.primaryColor),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  _capsuleField(
                    controller: _nameController,
                    hint: "Your Full Name",
                  ),
                  const SizedBox(height: 20),
                  _capsuleField(
                    controller: _phoneController,
                    hint: "Mobile Number",
                    isPhone: true,
                  ),
                  const SizedBox(height: 20),
                  _capsuleField(
                    controller: _addressController,
                    hint: "Delivery/Home Address",
                    maxLines: 3,
                  ),
                  const SizedBox(height: 20),
                  _accountTypeSelector(),
                  const SizedBox(height: 20),
                  _sourceSegmentSelector(),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 64,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleSaveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(AppConfig.primaryColor),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                      ),
                      child: _isLoading 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text("Complete Setup", style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
