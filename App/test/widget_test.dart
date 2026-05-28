// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:laundry_basket_app/main.dart';

void main() {
  testWidgets('Login screen smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const LaundryBasketApp(isLoggedIn: false));

    // Verify that the login screen shows the welcome message.
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Login to manage your laundry pickups.'), findsOneWidget);

    // Verify that the Skip button is present.
    expect(find.text('Skip'), findsOneWidget);

    // Verify that the Phone Number field is present.
    expect(find.text('Phone Number'), findsOneWidget);
  });
}
