import 'package:flutter/material.dart';
import '../feature_flags.dart';
import '../config.dart';
import '../services/state_service.dart';
import '../widgets/common.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'notifications_screen.dart';
import '../widgets/animated_testimonials.dart';
import '../models/order_model.dart';
import '../models/cart_model.dart';
import '../rates_data.dart';
import 'services_screen.dart';
import 'order_tracking_screen.dart';
import 'refer_earn_screen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> list = prefs.getStringList('local_notifications') ?? [];
      int count = 0;
      for (var item in list) {
        try {
          final map = jsonDecode(item);
          if (map['isRead'] == false) {
            count++;
          }
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _unreadCount = count;
        });
      }
    } catch (_) {}
  }

  final List<Map<String, dynamic>> _allServices = [
    {
      'label': 'Dry Clean',
      'icon': Icons.dry_cleaning_rounded,
      'color': const Color(0xFF8B5CF6),
      'categoryKeys': ['Dry Clean - Men', 'Dry Clean - Women', 'Dry Clean - House Item'],
    },
    {
      'label': 'Wash & Iron',
      'icon': Icons.wash_rounded,
      'color': const Color(0xFFEC4899),
      'categoryKeys': ['Wash & Iron - Men', 'Wash & Iron - Women', 'Wash & Iron - House Item'],
    },
    {
      'label': 'Wash Only',
      'icon': Icons.water_drop_rounded,
      'color': const Color(0xFF3B82F6),
      'categoryKeys': ['Wash Only - Men', 'Wash Only - Women'],
    },
    {
      'label': 'Steam Iron',
      'icon': Icons.iron_rounded,
      'color': const Color(0xFFF59E0B),
      'categoryKeys': ['Steam Iron - Men', 'Steam Iron - Women', 'Steam Iron - House Item'],
    },
    {
      'label': 'Shoe Cleaning',
      'icon': Icons.cleaning_services_rounded,
      'color': const Color(0xFF10B981),
      'categoryKeys': ['Shoe Cleaning'],
    },
    {
      'label': 'Hotel Linen',
      'icon': Icons.hotel_rounded,
      'color': const Color(0xFF0F766E),
      'categoryKeys': ['Hotel Linen', 'Guest Laundry'],
    },
    {
      'label': 'Express Delivery',
      'icon': Icons.bolt_rounded,
      'color': const Color(0xFFF59E0B),
      'categoryKeys': ['Instant Service - Men', 'Instant Service - Women', 'Instant Service - House Item'],
    },
    {
      'label': 'Premium Care',
      'icon': Icons.workspace_premium_rounded,
      'color': const Color(0xFF7C3AED),
      'categoryKeys': ['Premium Care - Men', 'Premium Care - Women', 'Premium Care - House Item'],
    },
    if (FeatureFlags.isEnabled('combo_of_pairs'))
      {
        'label': 'Combo of Pairs',
        'icon': Icons.style_rounded,
        'color': const Color(0xFFE11D48),
        'categoryKeys': ['Combo of Pairs - Men', 'Combo of Pairs - Women', 'Combo of Pairs - House Item'],
      },
  ];

  @override
  Widget build(BuildContext context) {
    final query = _searchQuery.toLowerCase().trim();
    final filteredServices = _allServices.where((s) {
      final label = s['label'].toString().toLowerCase();
      final keys = ((s['categoryKeys'] as List<String>).join(' ')).toLowerCase();
      return query.isEmpty || label.contains(query) || keys.contains(query);
    }).toList();
    List<RateItemWithService> searchItems = [];
    if (query.isNotEmpty) {
      LaundryRates.data.forEach((serviceKey, items) {
        for (var item in items) {
          final isMatch = item.name.toLowerCase().contains(query) ||
              item.category.toLowerCase().contains(query) ||
              serviceKey.toLowerCase().contains(query);
          if (isMatch) {
            searchItems.add(
              RateItemWithService(
                name: item.name,
                price: item.price,
                category: item.category,
                originalPrice: item.originalPrice,
                displayPrice: item.displayPrice,
                serviceKey: serviceKey,
              ),
            );
          }
        }
      });
      searchItems.sort((a, b) {
        final priceCompare = a.sortPrice.compareTo(b.sortPrice);
        if (priceCompare != 0) return priceCompare;
        return a.name.compareTo(b.name);
      });
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 40),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(AppConfig.primaryColor).withOpacity(0.15),
                  const Color(AppConfig.secondaryColor).withOpacity(0.05),
                  const Color(AppConfig.backgroundColor),
                ],
                stops: const [0.0, 0.4, 1.0],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    ValueListenableBuilder<String>(
                      valueListenable: userNameState,
                      builder: (context, name, _) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            '👋 Hello, ${name.split(" ")[0]}!',
                            style: const TextStyle(
                              color: Color(AppConfig.primaryColor),
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        );
                      },
                    ),
                    Row(
                      children: [
                        Stack(
                          children: [
                            IconButton(
                              icon: const Icon(
                                Icons.notifications_active_outlined,
                                color: Color(AppConfig.primaryColor),
                                size: 24,
                              ),
                              onPressed: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                                );
                                _loadUnreadCount();
                              },
                            ),
                            if (_unreadCount > 0)
                              Positioned(
                                right: 8,
                                top: 8,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.redAccent,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Text(
                                    '$_unreadCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w900,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),

                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome To',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey,
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          'Laundry Basket',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Color(AppConfig.primaryColor),
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(AppConfig.accentColor), Color(0xFFFF8C00)],
                            ),
                            borderRadius: BorderRadius.circular(100),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(AppConfig.accentColor).withOpacity(0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Text(
                            '✨ 15% OFF',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Expiring Soon, Grab Now!',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(AppConfig.accentColor),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(AppConfig.foregroundColor), Color(AppConfig.primaryColor)],
                  ).createShader(bounds),
                  child: Text(
                    'Doorstep pickup\nSame Day Delivery*',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      height: 1.1,
                      color: Colors.white, // Required for ShaderMask
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Professional laundry services at your doorstep. Freshness guaranteed within 48 hours.\n*Express delivery excluded',
                  style: TextStyle(fontSize: 16, color: Color(0xFF475467), height: 1.5),
                ),
                const SizedBox(height: 32),
                
                // Premium Search Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(AppConfig.borderColor).withOpacity(0.5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: (v) => setState(() => _searchQuery = v),
                          textInputAction: TextInputAction.search,
                          onSubmitted: (query) {
                            if (searchItems.isNotEmpty) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => RateListScreen(
                                    title: 'Search Results',
                                    categoryKeys: const [],
                                    searchItems: searchItems,
                                  ),
                                ),
                              );
                            }
                          },
                          decoration: InputDecoration(
                            hintText: 'Search for "Dry Clean" or "Shirt"',
                            hintStyle: TextStyle(color: Colors.grey.withOpacity(0.5), fontWeight: FontWeight.bold, fontSize: 14),
                            prefixIcon: const Icon(Icons.search_rounded, color: Color(AppConfig.primaryColor), size: 20),
                            suffixIcon: _searchQuery.isNotEmpty 
                              ? IconButton(
                                  icon: const Icon(Icons.close_rounded, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = "");
                                  },
                                )
                              : null,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        child: Material(
                          color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          child: InkWell(
                            onTap: () {
                              if (searchItems.isNotEmpty) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => RateListScreen(
                                      title: 'Search Results',
                                      categoryKeys: const [],
                                      searchItems: searchItems,
                                    ),
                                  ),
                                );
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: const Padding(
                              padding: EdgeInsets.all(8.0),
                              child: Icon(Icons.search, color: Color(AppConfig.primaryColor), size: 18),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 4),
                if (_searchQuery.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  if (searchItems.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            const Text(
                              'No services found matching your search.',
                              style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 24),
                            AppButton(
                              label: 'Request "$_searchQuery"',
                              icon: Icons.add_circle_outline,
                              onPressed: () {
                                navigationIndex.value = 2;
                                _searchController.clear();
                                setState(() => _searchQuery = "");
                              },
                            ),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Search Results (${searchItems.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(AppConfig.foregroundColor),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => RateListScreen(
                                  title: 'Search Results',
                                  categoryKeys: const [],
                                  searchItems: searchItems,
                                ),
                              ),
                            );
                          },
                          child: const Text('View All', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ValueListenableBuilder<List<CartItem>>(
                      valueListenable: cartState,
                      builder: (context, cartItems, _) {
                        return Column(
                          children: searchItems.take(10).map((item) {
                            final cartItemIndex = cartItems.indexWhere((i) {
                              if (i.rateItem.name != item.name) return false;
                              if (i.rateItem.price != item.price) return false;
                              if (i.rateItem is RateItemWithService) {
                                return (i.rateItem as RateItemWithService).serviceKey == item.serviceKey;
                              }
                              return true;
                            });
                            final quantity = cartItemIndex != -1 ? cartItems[cartItemIndex].quantity : 0;
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: quantity > 0 ? const Color(AppConfig.primaryColor) : const Color(0x100F2E57),
                                  width: quantity > 0 ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF102A43),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${item.serviceLabel} • ${item.category} • ${item.priceLabel}',
                                          style: const TextStyle(
                                            color: Color(AppConfig.primaryColor),
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (!item.canBookDirectly)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF1A6FDB).withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Text(
                                        'CALL',
                                        style: TextStyle(
                                          color: Color(AppConfig.primaryColor),
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  else if (quantity == 0)
                                    ElevatedButton(
                                      onPressed: () {
                                        cartState.value = [
                                          ...cartState.value,
                                          CartItem(rateItem: item),
                                        ];
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF1A6FDB).withOpacity(0.1),
                                        foregroundColor: const Color(AppConfig.primaryColor),
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                      ),
                                      child: const Text('ADD', style: TextStyle(fontWeight: FontWeight.bold)),
                                    )
                                  else
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(
                                            Icons.remove_circle_outline,
                                            color: Color(AppConfig.primaryColor),
                                            size: 20,
                                          ),
                                          onPressed: () {
                                            final newCart = List<CartItem>.from(cartState.value);
                                            if (newCart[cartItemIndex].quantity > 1) {
                                              newCart[cartItemIndex].quantity--;
                                            } else {
                                              newCart.removeAt(cartItemIndex);
                                            }
                                            cartState.value = newCart;
                                          },
                                        ),
                                        Text('$quantity', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        IconButton(
                                          icon: const Icon(
                                            Icons.add_circle_outline,
                                            color: Color(AppConfig.primaryColor),
                                            size: 20,
                                          ),
                                          onPressed: () {
                                            final newCart = List<CartItem>.from(cartState.value);
                                            newCart[cartItemIndex].quantity++;
                                            cartState.value = newCart;
                                          },
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ],
                ],

                if (_searchQuery.isEmpty) ...[
                  const SizedBox(height: 40),

                  // Live Order Preview Card
                  ValueListenableBuilder<List<LaundryOrder>>(
                    valueListenable: ordersState,
                    builder: (context, orders, _) {
                      if (orders.isEmpty) return const SizedBox.shrink();
                      final latestOrder = orders.last;
                      return Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                              blurRadius: 40,
                              offset: const Offset(0, 20),
                            ),
                          ],
                        ),
                        child: AppGlassCard(
                          padding: const EdgeInsets.all(28),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: Colors.green,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'LIVE TRACKING',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w900,
                                              color: const Color(AppConfig.primaryColor).withOpacity(0.6),
                                              fontSize: 10,
                                              letterSpacing: 1.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        latestOrder.status.toUpperCase(),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          color: Color(AppConfig.foregroundColor),
                                          fontSize: 24,
                                          letterSpacing: -1,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          const Color(AppConfig.primaryColor),
                                          const Color(AppConfig.primaryColor).withOpacity(0.7),
                                        ],
                                      ),
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(AppConfig.primaryColor).withOpacity(0.3),
                                          blurRadius: 15,
                                          offset: const Offset(0, 6),
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.moped_rounded,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 28),
                              
                              // Visual Progress
                              Stack(
                                children: [
                                  Container(
                                    height: 6,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: const Color(AppConfig.primaryColor).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                  AnimatedContainer(
                                    duration: const Duration(seconds: 1),
                                    height: 6,
                                    width: (MediaQuery.of(context).size.width - 104) * 0.65, // Example progress
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(colors: [Color(AppConfig.primaryColor), Color(0xFF10B981)]),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('ID: ${latestOrder.id}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Colors.grey)),
                                  const Text('Estimated 4:30 PM', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                              
                              const Divider(height: 48, thickness: 1),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Payable Amount',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF64748B), fontSize: 14),
                                  ),
                                  Text(
                                    latestOrder.price,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 26,
                                      color: Color(AppConfig.primaryColor),
                                      letterSpacing: -1,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 24),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(AppConfig.primaryColor),
                                    foregroundColor: Colors.white,
                                    shadowColor: const Color(AppConfig.primaryColor).withOpacity(0.3),
                                    elevation: 8,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  icon: const Icon(Icons.location_on_rounded, size: 20),
                                  label: const Text(
                                    'TRACK YOUR ORDER',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 14,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => OrderTrackingScreen(orderId: latestOrder.id),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),

          if (_searchQuery.isEmpty) ...[
            // Categories Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Our Services'),
                  const SizedBox(height: 24),
                  if (filteredServices.isNotEmpty)
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        mainAxisExtent: 120,
                      ),
                      itemCount: filteredServices.length,
                      itemBuilder: (context, index) {
                        final s = filteredServices[index];
                        return PressableScale(
                          child: GestureDetector(
                            onTap: () => _openService(context, s),
                            child: _buildCategoryCard(s['label'], s['icon'], s['color'])
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          ],

          if (_searchQuery.isEmpty) ...[
            const SizedBox(height: 40),
            _buildMembershipSection(context),
            const SizedBox(height: 24),
            _buildReferralBanner(context),
          ],

          const SizedBox(height: 40),

          if (_searchQuery.isEmpty) ...[
            // Dynamic Stats Section (Redesigned as Tabs/Cards)
            ValueListenableBuilder<List<LaundryOrder>>(
              valueListenable: ordersState,
              builder: (context, orders, _) {
                final orderCount = 10000 + orders.length;
                final userCount = 1000 + orders.length; // 1 increment per order
                
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      _buildStatCard(
                        '${orderCount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}+', 
                        'Orders',
                        Icons.shopping_bag_outlined,
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        '${userCount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}+', 
                        'Users',
                        Icons.people_outline,
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        '99%', 
                        'Happy',
                        Icons.sentiment_very_satisfied,
                      ),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 40),

            // Feedback Section
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: SectionHeader(
                title: 'What Customers Say',
                subtitle: 'Feedback',
              ),
            ),
            const SizedBox(height: 20),
            const AnimatedTestimonials(),
          ],
          const SizedBox(height: 120), // Extra space for bottom nav
        ],
      ),
    );
  }

  Widget _buildReferralBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ReferAndEarnScreen()),
          );
        },
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E3A8A).withOpacity(0.25),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.card_giftcard_rounded, color: Colors.amber, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      "Refer & Earn 100 Points",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                    SizedBox(height: 2),
                    Text(
                      "Give friends ₹100 OFF, get 100 Points",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(AppConfig.primaryColor),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  "INVITE",
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openService(BuildContext context, Map<String, dynamic> service) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RateListScreen(
          title: service['label'].toString(),
          categoryKeys: List<String>.from(service['categoryKeys'] as List),
        ),
      ),
    );
  }

  Widget _buildCategoryCard(String label, IconData icon, Color color) {
    return Container(
        height: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [color.withOpacity(0.08), color.withOpacity(0.02)],
          ),
          border: Border.all(color: color.withOpacity(0.1), width: 1.5),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              Positioned(
                right: -10,
                bottom: -10,
                child: Icon(icon, size: 80, color: color.withOpacity(0.05)),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: color, size: 24),
                    ),
                    Text(
                      label,
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        color: color.withOpacity(0.9),
                        fontSize: 14,
                        letterSpacing: -0.5,
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

  Widget _buildStatCard(String value, String label, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(AppConfig.borderColor).withOpacity(0.5)),
          boxShadow: [
            BoxShadow(
              color: const Color(AppConfig.primaryColor).withOpacity(0.03),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: const Color(AppConfig.primaryColor).withOpacity(0.5)),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Color(AppConfig.primaryColor),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMembershipSection(BuildContext context) {
    final List<Map<String, dynamic>> plans = [
      {
        'title': 'Silver Plan',
        'subtitle': 'Individual',
        'price': 999,
        'features': [
          '15 kg Wash & Iron',
          'Free Pickup & Delivery',
          '5% Extra Dry Clean Discount',
          'Standard 48-hour delivery',
        ],
        'color': const Color(0xFF94A3B8), // Silver slate
        'textColor': const Color(0xFF1E293B),
        'tag': null,
      },
      {
        'title': 'Gold Plan',
        'subtitle': 'Couples',
        'price': 1999,
        'features': [
          '35 kg Wash & Iron',
          'Free Pickup & Delivery',
          '10% Extra Dry Clean Discount',
          'Priority 24-hr delivery (2 slots)',
        ],
        'color': const Color(0xFFF59E0B), // Gold/Amber
        'textColor': const Color(0xFF78350F),
        'tag': 'Most Popular',
      },
      {
        'title': 'Platinum Plan',
        'subtitle': 'Family',
        'price': 3499,
        'features': [
          '65 kg Wash & Iron',
          'Free Pickup & Delivery',
          '15% Extra Dry Clean Discount',
          'Priority 24-hr delivery',
          '1 Free Shoe Cleaning',
        ],
        'color': const Color(0xFF6366F1), // Indigo
        'textColor': const Color(0xFF312E81),
        'tag': null,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24),
          child: SectionHeader(
            title: 'Prepaid Membership Plans',
            subtitle: 'Save Big',
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 380,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: plans.length,
            itemBuilder: (context, index) {
              final plan = plans[index];
              final bool isGold = plan['tag'] != null;

              return Container(
                width: MediaQuery.of(context).size.width * 0.82,
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: isGold ? const Color(AppConfig.primaryColor) : const Color(AppConfig.borderColor).withOpacity(0.8),
                    width: isGold ? 2.5 : 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isGold 
                          ? const Color(AppConfig.primaryColor).withOpacity(0.12)
                          : Colors.black.withOpacity(0.03),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: Stack(
                    children: [
                      Positioned(
                        right: -30,
                        top: -30,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: plan['color'].withOpacity(0.08),
                          ),
                        ),
                      ),
                      if (plan['tag'] != null)
                        Positioned(
                          top: 16,
                          right: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(AppConfig.primaryColor), Color(0xFF60A5FA)],
                              ),
                              borderRadius: BorderRadius.circular(100),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(AppConfig.primaryColor).withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Text(
                              plan['tag'].toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 9,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              plan['title'].toUpperCase(),
                              style: TextStyle(
                                color: plan['color'],
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              plan['subtitle'],
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  '₹${plan['price']}',
                                  style: TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.w900,
                                    color: plan['textColor'],
                                    letterSpacing: -1,
                                  ),
                                ),
                                const Text(
                                  ' / month',
                                  style: TextStyle(
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(height: 1, thickness: 1),
                            const SizedBox(height: 12),
                            Expanded(
                              child: Column(
                                children: (plan['features'] as List<String>).map((feat) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.check_circle_rounded,
                                          color: Color(0xFF10B981),
                                          size: 16,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            feat,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF334155),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              height: 46,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isGold ? const Color(AppConfig.primaryColor) : Colors.white,
                                  foregroundColor: isGold ? Colors.white : const Color(AppConfig.primaryColor),
                                  side: BorderSide(
                                    color: const Color(AppConfig.primaryColor),
                                    width: isGold ? 0 : 1.5,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  elevation: isGold ? 4 : 0,
                                  shadowColor: isGold ? const Color(AppConfig.primaryColor).withOpacity(0.3) : null,
                                ),
                                onPressed: () => _selectPlan(context, plan['title'], plan['price']),
                                child: Text(
                                  'Select ${plan['title'].split(" ")[0]}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 130), // Spacing to prevent content from being covered by the floating bottom dock
      ],
    );
  }

  void _selectPlan(BuildContext context, String planTitle, int planPrice) {
    String backendNameMapped = '';
    if (planTitle.contains('Silver')) {
      backendNameMapped = 'Silver Membership Package';
    } else if (planTitle.contains('Gold')) {
      backendNameMapped = 'Gold Membership Package';
    } else if (planTitle.contains('Platinum')) {
      backendNameMapped = 'Platinum Membership Package';
    }

    final packageItem = RateItem(
      name: backendNameMapped,
      price: planPrice,
      category: 'Membership',
    );
    cartState.value = [CartItem(rateItem: packageItem, quantity: 1)];

    navigationIndex.value = 2;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text('🎉 $planTitle added! Confirm pickup to activate.')),
          ],
        ),
        backgroundColor: const Color(AppConfig.primaryColor),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class RateItemWithService extends RateItem {
  final String serviceKey;

  const RateItemWithService({
    required super.name,
    required super.price,
    required super.category,
    super.originalPrice,
    super.displayPrice,
    required this.serviceKey,
  });

  String get serviceLabel {
    if (serviceKey.startsWith('Dry Clean')) return 'Dry Cleaning';
    if (serviceKey.startsWith('Combo of Pairs')) return 'Combo of Pairs New';
    if (serviceKey.contains(' - ')) {
      return serviceKey.split(' - ').first;
    }
    return serviceKey;
  }
}
