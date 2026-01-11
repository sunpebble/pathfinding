import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/blog_post.dart';
import '../../../../data/models/itinerary.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../../../data/services/auth_service.dart';
import '../../../blog/providers/blog_provider.dart';
import '../../../blog/presentation/widgets/blog_map_view.dart';
import '../../providers/itinerary_provider.dart';

/// Day data model for organizing locations
class DayData {
  final int dayNumber;
  final List<BlogLocation> locations;

  DayData({required this.dayNumber, required this.locations});

  DayData copyWith({int? dayNumber, List<BlogLocation>? locations}) {
    return DayData(
      dayNumber: dayNumber ?? this.dayNumber,
      locations: locations ?? this.locations,
    );
  }
}

/// Imported itinerary page with clean timeline design
class ImportedItineraryPage extends ConsumerStatefulWidget {
  final String? blogPostId;

  const ImportedItineraryPage({super.key, this.blogPostId});

  @override
  ConsumerState<ImportedItineraryPage> createState() =>
      _ImportedItineraryPageState();
}

class _ImportedItineraryPageState extends ConsumerState<ImportedItineraryPage> {
  List<DayData> _days = [];
  final _titleController = TextEditingController();
  final _tipsController = TextEditingController();
  bool _isLoading = false;
  bool _isEditMode = false;
  bool _isTitleEditing = false;
  String? _selectedLocationId;

  @override
  void initState() {
    super.initState();
    _tipsController.text = '当地天气多变，建议备好雨具';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.blogPostId != null && mounted) {
        ref
            .read(currentBlogNotifierProvider.notifier)
            .loadBlogPost(widget.blogPostId!);
      }
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _tipsController.dispose();
    super.dispose();
  }

  List<BlogLocation> get _allLocations {
    return _days.expand((day) => day.locations).toList();
  }

  /// Parse blog content to extract day-based itinerary
  /// Prioritizes AI-extracted days when available
  List<DayData> _parseBlogToDays(BlogPostWithStats blogPost) {
    // Use AI-extracted days if available
    if (blogPost.aiDays.isNotEmpty) {
      return blogPost.aiDays.map((aiDay) {
        final locations = aiDay.pois.asMap().entries.map((entry) {
          final poi = entry.value;
          return BlogLocation(
            id: 'ai_${aiDay.dayNumber}_${entry.key}',
            name: poi.name,
            description: poi.description,
            latitude: poi.latitude,
            longitude: poi.longitude,
            order: entry.key,
            category: poi.type,
          );
        }).toList();
        return DayData(dayNumber: aiDay.dayNumber, locations: locations);
      }).toList();
    }

    // Fallback: parse from content using regex
    final content = blogPost.content;
    final locations = List<BlogLocation>.from(blogPost.locations);

    if (locations.isEmpty) {
      return [DayData(dayNumber: 1, locations: [])];
    }

    final dayPatterns = [
      RegExp(r'第[一二三四五六七八九十\d]+天'),
      RegExp(r'第[一二三四五六七八九十\d]+站'),
      RegExp(r'Day\s*\d+', caseSensitive: false),
      RegExp(r'最后一天'),
    ];

    final dayMarkers = <int, int>{};
    int currentDay = 0;

    for (final pattern in dayPatterns) {
      for (final match in pattern.allMatches(content)) {
        currentDay++;
        final dayNum = _extractDayNumber(match.group(0)!, currentDay);
        dayMarkers[match.start] = dayNum;
      }
    }

    if (dayMarkers.isEmpty) {
      final locationsPerDay = 3;
      final numDays = (locations.length / locationsPerDay).ceil().clamp(1, 7);
      final days = <DayData>[];

      for (int d = 0; d < numDays; d++) {
        final startIdx = d * locationsPerDay;
        final endIdx = ((d + 1) * locationsPerDay).clamp(0, locations.length);
        if (startIdx < locations.length) {
          days.add(
            DayData(
              dayNumber: d + 1,
              locations: locations.sublist(startIdx, endIdx),
            ),
          );
        }
      }
      return days;
    }

    final sortedPositions = dayMarkers.keys.toList()..sort();
    final numDays = sortedPositions.length;
    final days = <DayData>[];

    for (int d = 0; d < numDays; d++) {
      days.add(DayData(dayNumber: d + 1, locations: []));
    }

    for (final location in locations) {
      final locationPos = content.indexOf(location.name);
      if (locationPos == -1) {
        days.last = days.last.copyWith(
          locations: [...days.last.locations, location],
        );
        continue;
      }

      int dayIndex = 0;
      for (int i = 0; i < sortedPositions.length; i++) {
        if (locationPos >= sortedPositions[i]) dayIndex = i;
      }
      days[dayIndex] = days[dayIndex].copyWith(
        locations: [...days[dayIndex].locations, location],
      );
    }

    return days.where((d) => d.locations.isNotEmpty).toList().isEmpty
        ? [DayData(dayNumber: 1, locations: locations)]
        : days.where((d) => d.locations.isNotEmpty).toList();
  }

  int _extractDayNumber(String marker, int defaultNum) {
    final chineseNums = {
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '七': 7,
      '八': 8,
      '九': 9,
      '十': 10,
    };
    if (marker.contains('最后')) return 99;
    for (final entry in chineseNums.entries) {
      if (marker.contains(entry.key)) return entry.value;
    }
    final numMatch = RegExp(r'\d+').firstMatch(marker);
    if (numMatch != null) return int.parse(numMatch.group(0)!);
    return defaultNum;
  }

  void _addDay() {
    setState(() {
      _days.add(DayData(dayNumber: _days.length + 1, locations: []));
    });
  }

  void _removeDay(int dayIndex) {
    if (_days.length <= 1) return;
    setState(() {
      _days.removeAt(dayIndex);
      for (int i = 0; i < _days.length; i++) {
        _days[i] = _days[i].copyWith(dayNumber: i + 1);
      }
    });
  }

  void _reorderDays(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final day = _days.removeAt(oldIndex);
      _days.insert(newIndex, day);
      // Renumber days
      for (int i = 0; i < _days.length; i++) {
        _days[i] = _days[i].copyWith(dayNumber: i + 1);
      }
    });
  }

  void _reorderItemsInDay(int dayIndex, int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final locations = List<BlogLocation>.from(_days[dayIndex].locations);
      final item = locations.removeAt(oldIndex);
      locations.insert(newIndex, item);
      _days[dayIndex] = _days[dayIndex].copyWith(locations: locations);
    });
  }

  void _removeItem(int dayIndex, int itemIndex) {
    setState(() {
      final locations = List<BlogLocation>.from(_days[dayIndex].locations);
      locations.removeAt(itemIndex);
      _days[dayIndex] = _days[dayIndex].copyWith(locations: locations);
    });
  }

  void _editNotes(int dayIndex, int itemIndex) {
    final location = _days[dayIndex].locations[itemIndex];
    final notesController = TextEditingController(
      text: location.description ?? '',
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${location.name} 备注',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesController,
              autofocus: true,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: '添加备注信息...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: AdaptiveButton(
                onPressed: () {
                  setState(() {
                    final locations = List<BlogLocation>.from(
                      _days[dayIndex].locations,
                    );
                    locations[itemIndex] = BlogLocation(
                      id: location.id,
                      name: location.name,
                      latitude: location.latitude,
                      longitude: location.longitude,
                      category: location.category,
                      description: notesController.text.trim().isEmpty
                          ? null
                          : notesController.text.trim(),
                      order: location.order,
                    );
                    _days[dayIndex] = _days[dayIndex].copyWith(
                      locations: locations,
                    );
                  });
                  Navigator.pop(context);
                },
                child: const Text('保存'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _addNewLocation(int dayIndex, String category) {
    final nameController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '添加$category',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: '输入${category}名称',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: AdaptiveButton(
                onPressed: () {
                  if (nameController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(const SnackBar(content: Text('请输入名称')));
                    return;
                  }
                  setState(() {
                    final locations = List<BlogLocation>.from(
                      _days[dayIndex].locations,
                    );
                    locations.add(
                      BlogLocation(
                        id: 'new_${DateTime.now().millisecondsSinceEpoch}',
                        name: nameController.text.trim(),
                        latitude: 0,
                        longitude: 0,
                        category: category,
                        description: null,
                        order: locations.length,
                      ),
                    );
                    _days[dayIndex] = _days[dayIndex].copyWith(
                      locations: locations,
                    );
                  });
                  Navigator.pop(context);
                },
                child: const Text('添加'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openMemoPage() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MemoPage()),
    );
  }

  void _editTips() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '温馨提示',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tipsController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: '输入行程备注...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: AdaptiveButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('完成'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveItinerary() async {
    final authService = ref.read(authServiceProvider);
    if (!authService.isAuthenticated) {
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('需要登录'),
          content: const Text('保存行程需要先登录账号'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('去登录'),
            ),
          ],
        ),
      );
      if (shouldLogin == true && mounted) context.push('/login');
      return;
    }

    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('请输入行程名称')));
      return;
    }

    setState(() => _isLoading = true);

    final days = _days.map((day) {
      final items = day.locations.asMap().entries.map((entry) {
        final location = entry.value;
        return CreateItineraryItemInput(
          poiName: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          orderIndex: entry.key,
          category: location.category,
          notes: location.description,
        );
      }).toList();
      return CreateItineraryDayInput(dayNumber: day.dayNumber, items: items);
    }).toList();

    final input = CreateItineraryInput(
      title: _titleController.text.trim(),
      days: days,
    );
    final result = await ref
        .read(currentItineraryNotifierProvider.notifier)
        .createItinerary(input);

    setState(() => _isLoading = false);

    if (result != null && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('行程已保存')));
      context.go('/itinerary/${result.id}');
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final blogAsync = ref.watch(currentBlogNotifierProvider);

    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: blogAsync.when(
        data: (blogPost) {
          if (blogPost == null)
            return const Center(child: CircularProgressIndicator());

          if (_days.isEmpty && blogPost.locations.isNotEmpty) {
            _days = _parseBlogToDays(blogPost);
            _titleController.text = blogPost.title;
          } else if (_days.isEmpty) {
            _days = [DayData(dayNumber: 1, locations: [])];
          }

          return SafeArea(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios, size: 20),
                          onPressed: () => Navigator.pop(context),
                        ),
                        const Expanded(
                          child: Text(
                            '我的攻略',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 48),
                      ],
                    ),
                  ),

                  // Title section - smaller, cleaner
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: _isTitleEditing
                              ? TextField(
                                  controller: _titleController,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  autofocus: true,
                                  decoration: const InputDecoration(
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.zero,
                                    isDense: true,
                                  ),
                                  onSubmitted: (_) =>
                                      setState(() => _isTitleEditing = false),
                                  onTapOutside: (_) =>
                                      setState(() => _isTitleEditing = false),
                                )
                              : GestureDetector(
                                  onTap: () =>
                                      setState(() => _isTitleEditing = true),
                                  child: Text(
                                    _titleController.text.isEmpty
                                        ? '输入行程名称'
                                        : _titleController.text,
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w500,
                                      color: _titleController.text.isEmpty
                                          ? AppColors.textHint
                                          : null,
                                    ),
                                  ),
                                ),
                        ),
                        TextButton(
                          onPressed: _openMemoPage,
                          child: Text(
                            '备忘录',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Map section
                  if (_allLocations.isNotEmpty)
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: BlogMapView(
                          locations: _allLocations,
                          height: 160,
                          selectedLocationId: _selectedLocationId,
                          onLocationSelected: (id) =>
                              setState(() => _selectedLocationId = id),
                        ),
                      ),
                    ),

                  const SizedBox(height: 8),

                  // Itinerary section
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              '行程',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextButton(
                              onPressed: () =>
                                  setState(() => _isEditMode = !_isEditMode),
                              child: Text(
                                _isEditMode ? '完成' : '编辑行程',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Days list - reorderable when editing
                        _isEditMode
                            ? ReorderableListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _days.length,
                                onReorder: _reorderDays,
                                buildDefaultDragHandles: false,
                                itemBuilder: (context, dayIndex) =>
                                    _buildDaySection(
                                      dayIndex,
                                      _days[dayIndex],
                                      key: ValueKey('day_$dayIndex'),
                                    ),
                              )
                            : Column(
                                children: List.generate(
                                  _days.length,
                                  (dayIndex) => _buildDaySection(
                                    dayIndex,
                                    _days[dayIndex],
                                  ),
                                ),
                              ),

                        // Add day button
                        if (_isEditMode)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: InkWell(
                              onTap: _addDay,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 8,
                                ),
                                child: Row(
                                  children: [
                                    const SizedBox(width: 7),
                                    Icon(
                                      Icons.add_circle,
                                      size: 18,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      '添加一天',
                                      style: TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w500,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),

                        // Tips section - editable
                        const SizedBox(height: 20),
                        GestureDetector(
                          onTap: _editTips,
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange.withAlpha(20),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.wb_sunny,
                                  color: Colors.orange,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '温馨提示：${_tipsController.text}',
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                                Icon(
                                  Icons.edit_outlined,
                                  color: AppColors.textHint,
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 80),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: AppColors.error),
              const SizedBox(height: 16),
              const Text('加载失败'),
              const SizedBox(height: 16),
              AdaptiveButton(
                onPressed: () {
                  if (widget.blogPostId != null)
                    ref
                        .read(currentBlogNotifierProvider.notifier)
                        .loadBlogPost(widget.blogPostId!);
                },
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        color: Colors.white,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: AdaptiveButton(
              onPressed: _isLoading ? null : _saveItinerary,
              child: _isLoading
                  ? const CupertinoActivityIndicator(color: Colors.white)
                  : const Text('保存为我的行程'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDaySection(int dayIndex, DayData day, {Key? key}) {
    return Container(
      key: key,
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day header
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '第${day.dayNumber}天',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (_isEditMode) ...[
                const Spacer(),
                if (_days.length > 1)
                  GestureDetector(
                    onTap: () => _removeDay(dayIndex),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '删除',
                        style: TextStyle(color: AppColors.error, fontSize: 12),
                      ),
                    ),
                  ),
                ReorderableDragStartListener(
                  index: dayIndex,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.drag_handle,
                      size: 18,
                      color: AppColors.textHint,
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 8),

          // Locations in day
          Padding(
            padding: const EdgeInsets.only(left: 20),
            child: _isEditMode
                ? ReorderableListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: day.locations.length,
                    onReorder: (oldIdx, newIdx) =>
                        _reorderItemsInDay(dayIndex, oldIdx, newIdx),
                    buildDefaultDragHandles: false,
                    itemBuilder: (context, itemIndex) => _buildLocationItem(
                      dayIndex,
                      itemIndex,
                      day.locations[itemIndex],
                      key: ValueKey('loc_${dayIndex}_$itemIndex'),
                    ),
                  )
                : Column(
                    children: List.generate(
                      day.locations.length,
                      (itemIndex) => _buildLocationItem(
                        dayIndex,
                        itemIndex,
                        day.locations[itemIndex],
                      ),
                    ),
                  ),
          ),

          // Add buttons
          if (_isEditMode)
            Padding(
              padding: const EdgeInsets.only(left: 20, top: 4),
              child: Wrap(
                spacing: 12,
                children: [
                  GestureDetector(
                    onTap: () => _addNewLocation(dayIndex, '景点'),
                    child: Text(
                      '+ 景点',
                      style: TextStyle(color: AppColors.primary, fontSize: 12),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _addNewLocation(dayIndex, '美食'),
                    child: Text(
                      '+ 美食',
                      style: TextStyle(color: Colors.orange, fontSize: 12),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _addNewLocation(dayIndex, '住宿'),
                    child: Text(
                      '+ 住宿',
                      style: TextStyle(color: Colors.purple, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLocationItem(
    int dayIndex,
    int itemIndex,
    BlogLocation location, {
    Key? key,
  }) {
    final isSelected = _selectedLocationId == location.id;
    return Container(
      key: key,
      margin: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(
                () => _selectedLocationId = isSelected ? null : location.id,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        '${location.category ?? "景点"}：',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          location.name,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isSelected ? AppColors.primary : null,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _editNotes(dayIndex, itemIndex),
                        child: Text(
                          location.description != null ? '编辑备注' : '添加备注',
                          style: TextStyle(
                            color: AppColors.textHint,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (location.description != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2, left: 48),
                      child: Text(
                        location.description!,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (_isEditMode) ...[
            GestureDetector(
              onTap: () => _removeItem(dayIndex, itemIndex),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Icon(
                  Icons.close,
                  size: 14,
                  color: AppColors.error.withAlpha(180),
                ),
              ),
            ),
            ReorderableDragStartListener(
              index: itemIndex,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.drag_handle,
                  size: 14,
                  color: AppColors.textHint,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Memo page like iPhone Notes
class MemoPage extends StatefulWidget {
  const MemoPage({super.key});

  @override
  State<MemoPage> createState() => _MemoPageState();
}

class _MemoPageState extends State<MemoPage> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller.text = '';
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.grey[50],
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          '备忘录',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: Colors.grey[800],
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(10),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            autofocus: true,
            maxLines: null,
            expands: true,
            textAlignVertical: TextAlignVertical.top,
            decoration: const InputDecoration(
              hintText: '输入备忘内容...',
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(16),
            ),
            style: const TextStyle(fontSize: 16, height: 1.6),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            border: Border(top: BorderSide(color: Colors.grey.withAlpha(50))),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: Icon(Icons.check_box_outlined, color: Colors.grey[600]),
                onPressed: () {},
              ),
              IconButton(
                icon: Icon(Icons.camera_alt_outlined, color: Colors.grey[600]),
                onPressed: () {},
              ),
              IconButton(
                icon: Icon(Icons.draw_outlined, color: Colors.grey[600]),
                onPressed: () {},
              ),
              IconButton(
                icon: Icon(Icons.format_list_bulleted, color: Colors.grey[600]),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }
}
