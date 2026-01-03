import type { ItineraryItem } from '@pathfinding/types';
import { useCallback, useRef, useState } from 'react';

interface ReorderState {
  isDragging: boolean;
  draggedItemId: string | null;
  sourceIndex: number | null;
  targetIndex: number | null;
}

interface UndoAction {
  type: 'reorder';
  previousOrder: string[];
  newOrder: string[];
  dayId: string;
}

interface UseDragReorderOptions {
  onReorder: (dayId: string, itemIds: string[]) => Promise<void>;
  onUndo?: () => void;
}

/**
 * useDragReorder - hook for managing drag-to-reorder functionality
 */
export function useDragReorder({ onReorder, onUndo }: UseDragReorderOptions) {
  const [reorderState, setReorderState] = useState<ReorderState>({
    isDragging: false,
    draggedItemId: null,
    sourceIndex: null,
    targetIndex: null,
  });

  const undoStack = useRef<UndoAction[]>([]);
  const itemOrderRef = useRef<Map<string, string[]>>(new Map());

  // Start dragging an item
  const startDrag = useCallback((itemId: string, index: number) => {
    setReorderState({
      isDragging: true,
      draggedItemId: itemId,
      sourceIndex: index,
      targetIndex: index,
    });
  }, []);

  // Update target position during drag
  const updateDragTarget = useCallback((targetIndex: number) => {
    setReorderState((prev) => ({
      ...prev,
      targetIndex,
    }));
  }, []);

  // End drag and apply reorder
  const endDrag = useCallback(
    async (dayId: string, items: ItineraryItem[]) => {
      const { sourceIndex, targetIndex, draggedItemId } = reorderState;

      // Reset state first
      setReorderState({
        isDragging: false,
        draggedItemId: null,
        sourceIndex: null,
        targetIndex: null,
      });

      // Check if actually moved
      if (
        sourceIndex === null ||
        targetIndex === null ||
        sourceIndex === targetIndex ||
        !draggedItemId
      ) {
        return;
      }

      // Calculate new order
      const currentOrder = items.map((item) => item.id);
      const newOrder = [...currentOrder];
      const [movedItem] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      // Store for undo
      undoStack.current.push({
        type: 'reorder',
        previousOrder: currentOrder,
        newOrder,
        dayId,
      });

      // Keep only last 10 undo actions
      if (undoStack.current.length > 10) {
        undoStack.current.shift();
      }

      // Store current order for reference
      itemOrderRef.current.set(dayId, newOrder);

      // Apply reorder
      try {
        await onReorder(dayId, newOrder);
      } catch (error) {
        console.error('[useDragReorder] Failed to reorder:', error);
        // Revert on error
        undoStack.current.pop();
        itemOrderRef.current.set(dayId, currentOrder);
        throw error;
      }
    },
    [reorderState, onReorder]
  );

  // Cancel drag without applying changes
  const cancelDrag = useCallback(() => {
    setReorderState({
      isDragging: false,
      draggedItemId: null,
      sourceIndex: null,
      targetIndex: null,
    });
  }, []);

  // Undo last reorder action
  const undoReorder = useCallback(async () => {
    const lastAction = undoStack.current.pop();
    if (!lastAction) return;

    try {
      await onReorder(lastAction.dayId, lastAction.previousOrder);
      itemOrderRef.current.set(lastAction.dayId, lastAction.previousOrder);
      onUndo?.();
    } catch (error) {
      console.error('[useDragReorder] Failed to undo reorder:', error);
      // Put action back on stack if undo failed
      undoStack.current.push(lastAction);
      throw error;
    }
  }, [onReorder, onUndo]);

  // Check if undo is available
  const canUndo = undoStack.current.length > 0;

  // Get reordered items for preview during drag
  const getReorderedItems = useCallback(
    (items: ItineraryItem[]): ItineraryItem[] => {
      const { sourceIndex, targetIndex } = reorderState;

      if (sourceIndex === null || targetIndex === null) {
        return items;
      }

      const result = [...items];
      const [movedItem] = result.splice(sourceIndex, 1);
      result.splice(targetIndex, 0, movedItem);
      return result;
    },
    [reorderState]
  );

  return {
    // State
    isDragging: reorderState.isDragging,
    draggedItemId: reorderState.draggedItemId,
    sourceIndex: reorderState.sourceIndex,
    targetIndex: reorderState.targetIndex,

    // Actions
    startDrag,
    updateDragTarget,
    endDrag,
    cancelDrag,
    undoReorder,

    // Helpers
    canUndo,
    getReorderedItems,
  };
}
