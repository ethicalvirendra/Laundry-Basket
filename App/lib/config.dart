import 'package:flutter/foundation.dart';

class AppConfig {
  // FOR PC DEVELOPMENT / LOCAL TESTING (Use this to test on PC with local backend):
  // static const String baseUrl = kIsWeb ? "http://localhost:5001" : "http://10.0.2.2:5001";

  // FOR PRODUCTION DEPLOYMENT (Uncomment when releasing):
  static const String baseUrl = "https://www.laundrybasketunicorn.com";

  // Design System Tokens (Premium Blue Theme)
  static const int primaryColor = 0xFF3B82F6;
  static const int secondaryColor = 0xFF60A5FA;
  static const int accentColor = 0xFFF59E0B;
  static const int backgroundColor = 0xFFF8FAFC;
  static const int foregroundColor = 0xFF1E3A8A;
  static const int borderColor = 0xFFE2E8F0;

  // App Release Version
  static const String appVersion = "6.0.0";
}
