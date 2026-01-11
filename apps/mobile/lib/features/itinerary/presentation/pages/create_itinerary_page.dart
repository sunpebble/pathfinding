import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/models/itinerary.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../providers/itinerary_provider.dart';

/// Create itinerary page
class CreateItineraryPage extends ConsumerStatefulWidget {
  const CreateItineraryPage({super.key});

  @override
  ConsumerState<CreateItineraryPage> createState() =>
      _CreateItineraryPageState();
}

class _CreateItineraryPageState extends ConsumerState<CreateItineraryPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  String _visibility = 'private';
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _selectStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() {
        _startDate = date;
        // If end date is before start date, update it
        if (_endDate != null && _endDate!.isBefore(date)) {
          _endDate = date;
        }
      });
    }
  }

  Future<void> _selectEndDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDate ?? _startDate ?? DateTime.now(),
      firstDate: _startDate ?? DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _endDate = date);
    }
  }

  Future<void> _createItinerary() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final input = CreateItineraryInput(
      title: _titleController.text.trim(),
      visibility: _visibility,
      startDate: _startDate,
      endDate: _endDate,
    );

    final result = await ref
        .read(currentItineraryNotifierProvider.notifier)
        .createItinerary(input);

    setState(() => _isLoading = false);

    if (result != null && mounted) {
      // Navigate to the new itinerary
      context.go('/itinerary/${result.id}');
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('创建行程失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('创建行程')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Title
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: '行程名称',
                hintText: '例如：东京5日游',
                prefixIcon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return '请输入行程名称';
                }
                return null;
              },
            ),

            const SizedBox(height: 24),

            // Date selection
            Text('行程日期（可选）', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _selectStartDate,
                    icon: const Icon(Icons.calendar_today),
                    label: Text(
                      _startDate == null
                          ? '开始日期'
                          : '${_startDate!.month}月${_startDate!.day}日',
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _selectEndDate,
                    icon: const Icon(Icons.calendar_today),
                    label: Text(
                      _endDate == null
                          ? '结束日期'
                          : '${_endDate!.month}月${_endDate!.day}日',
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Visibility
            Text('可见性', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'private',
                  label: Text('仅自己'),
                  icon: Icon(Icons.lock_outline),
                ),
                ButtonSegment(
                  value: 'public',
                  label: Text('公开'),
                  icon: Icon(Icons.public),
                ),
              ],
              selected: {_visibility},
              onSelectionChanged: (selected) {
                setState(() => _visibility = selected.first);
              },
            ),

            const SizedBox(height: 32),

            // Create button
            AdaptiveButton(
              onPressed: _isLoading ? null : _createItinerary,
              child: _isLoading
                  ? const CupertinoActivityIndicator(color: Colors.white)
                  : const Text('创建行程'),
            ),
          ],
        ),
      ),
    );
  }
}
