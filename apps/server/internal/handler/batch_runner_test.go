package handler

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

// waitForBatchFinished 轮询批次状态直到无 pending/running 任务或超时。
func waitForBatchFinished(t *testing.T, r *BatchRunner, batchID string) *BatchStatus {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		status, ok := r.Status(batchID)
		if !ok {
			t.Fatalf("批次 %s 状态不存在", batchID)
		}
		if status.Pending == 0 && status.Running == 0 {
			return status
		}
		if time.Now().After(deadline) {
			t.Fatalf("等待批次 %s 完成超时: %+v", batchID, status)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestBatchRunner_SequentialExecutionWithRateLimit(t *testing.T) {
	// Arrange: 记录执行顺序与 sleep 调用（注入假 sleep 验证限速逻辑）
	var mu sync.Mutex
	var executed []string
	exec := func(_ context.Context, task CrawlTask) (TaskOutcome, error) {
		mu.Lock()
		executed = append(executed, task.DestinationID)
		mu.Unlock()
		return TaskOutcome{Found: 1, Saved: 1}, nil
	}

	interval := 3 * time.Second
	r := NewBatchRunner(exec, interval)
	var sleepMu sync.Mutex
	var sleeps []time.Duration
	r.sleep = func(d time.Duration) {
		sleepMu.Lock()
		sleeps = append(sleeps, d)
		sleepMu.Unlock()
	}
	r.Start()
	defer r.Stop()

	tasks := []CrawlTask{
		{TaskType: taskTypeQAList, DestinationID: "1"},
		{TaskType: taskTypeQAList, DestinationID: "2"},
		{TaskType: taskTypeQAList, DestinationID: "3"},
	}

	// Act
	if err := r.Enqueue("b1", tasks); err != nil {
		t.Fatalf("入队应成功, got: %v", err)
	}
	status := waitForBatchFinished(t, r, "b1")

	// Assert: 顺序执行、计数正确
	if status.Succeeded != 3 {
		t.Errorf("应有 3 个任务成功, got: %+v", status)
	}
	mu.Lock()
	gotOrder := strings.Join(executed, ",")
	mu.Unlock()
	if gotOrder != "1,2,3" {
		t.Errorf("任务应按入队顺序串行执行, got: %s", gotOrder)
	}

	// Assert: 任务之间必须有限速间隔（每个任务执行后 sleep interval）
	sleepMu.Lock()
	defer sleepMu.Unlock()
	if len(sleeps) < 2 {
		t.Fatalf("3 个任务之间至少应有 2 次限速 sleep, got %d", len(sleeps))
	}
	for i, d := range sleeps {
		if d != interval {
			t.Errorf("第 %d 次 sleep 应为 %v, got %v", i, interval, d)
		}
	}
}

func TestBatchRunner_FailedTaskReasonVisible(t *testing.T) {
	// Arrange: 执行器对特定任务返回错误，失败原因必须可查询
	exec := func(_ context.Context, task CrawlTask) (TaskOutcome, error) {
		if task.DestinationID == "bad" {
			return TaskOutcome{}, errors.New("captcha wall detected")
		}
		return TaskOutcome{Found: 1, Saved: 1}, nil
	}
	r := NewBatchRunner(exec, 0)
	r.Start()
	defer r.Stop()

	// Act
	if err := r.Enqueue("b1", []CrawlTask{
		{TaskType: taskTypeQAList, DestinationID: "ok"},
		{TaskType: taskTypeQAList, DestinationID: "bad"},
	}); err != nil {
		t.Fatalf("入队应成功, got: %v", err)
	}
	status := waitForBatchFinished(t, r, "b1")

	// Assert
	if status.Succeeded != 1 || status.Failed != 1 {
		t.Fatalf("应 1 成功 1 失败, got: %+v", status)
	}
	var failedTask *TaskResult
	for i := range status.Tasks {
		if status.Tasks[i].Status == TaskStatusFailed {
			failedTask = &status.Tasks[i]
		}
	}
	if failedTask == nil {
		t.Fatal("应有失败任务记录")
	}
	if !strings.Contains(failedTask.Error, "captcha wall detected") {
		t.Errorf("失败原因必须透出, got: %q", failedTask.Error)
	}
}

func TestBatchRunner_QueueFullRejectsWholeBatch(t *testing.T) {
	// Arrange: 未启动的 runner，队列不消费
	exec := func(_ context.Context, _ CrawlTask) (TaskOutcome, error) {
		return TaskOutcome{}, nil
	}
	r := NewBatchRunner(exec, 0)

	fill := make([]CrawlTask, batchQueueCapacity)
	for i := range fill {
		fill[i] = CrawlTask{TaskType: taskTypeQAList, DestinationID: "x"}
	}
	if err := r.Enqueue("full", fill); err != nil {
		t.Fatalf("填满队列的入队应成功, got: %v", err)
	}

	// Act: 队列已满，再入队必须整体拒绝
	err := r.Enqueue("overflow", []CrawlTask{{TaskType: taskTypeQAList, DestinationID: "y"}})

	// Assert
	if err == nil || !strings.Contains(err.Error(), "queue full") {
		t.Errorf("队列满时必须返回明确错误, got: %v", err)
	}
	if _, ok := r.Status("overflow"); ok {
		t.Error("被拒绝的批次不应注册状态")
	}
}

func TestBatchRunner_DuplicateBatchIDRejected(t *testing.T) {
	// Arrange
	r := NewBatchRunner(func(_ context.Context, _ CrawlTask) (TaskOutcome, error) {
		return TaskOutcome{}, nil
	}, 0)
	task := []CrawlTask{{TaskType: taskTypeQAList, DestinationID: "1"}}
	if err := r.Enqueue("b1", task); err != nil {
		t.Fatalf("首次入队应成功, got: %v", err)
	}

	// Act
	err := r.Enqueue("b1", task)

	// Assert
	if err == nil || !strings.Contains(err.Error(), "duplicate batch id") {
		t.Errorf("重复 batchId 必须拒绝, got: %v", err)
	}
}

func TestBatchRunner_EvictsOnlyFinishedBatches(t *testing.T) {
	// Arrange: 注册满 maxTrackedBatches 个未完结批次
	r := NewBatchRunner(func(_ context.Context, _ CrawlTask) (TaskOutcome, error) {
		return TaskOutcome{}, nil
	}, 0)
	for i := 0; i < maxTrackedBatches; i++ {
		id := fmt.Sprintf("b%d", i)
		if err := r.Enqueue(id, []CrawlTask{{TaskType: taskTypeQAList, DestinationID: id}}); err != nil {
			t.Fatalf("入队 %s 应成功, got: %v", id, err)
		}
	}

	// Act 1: 全部未完结时，新批次必须被拒绝（绝不淘汰未完结批次）
	err := r.Enqueue("rejected", []CrawlTask{{TaskType: taskTypeQAList, DestinationID: "x"}})
	if err == nil || !strings.Contains(err.Error(), "too many active batches") {
		t.Fatalf("活跃批次超限必须拒绝, got: %v", err)
	}

	// Act 2: 把最旧批次标记完结后，新批次入队应淘汰它
	r.mu.Lock()
	for _, taskResult := range r.batches["b0"].tasks {
		taskResult.Status = TaskStatusSucceeded
	}
	r.mu.Unlock()
	if err := r.Enqueue("accepted", []CrawlTask{{TaskType: taskTypeQAList, DestinationID: "y"}}); err != nil {
		t.Fatalf("完结批次淘汰后入队应成功, got: %v", err)
	}

	// Assert
	if _, ok := r.Status("b0"); ok {
		t.Error("最旧的已完结批次应被淘汰")
	}
	if _, ok := r.Status("accepted"); !ok {
		t.Error("新批次应注册成功")
	}
}

func TestBatchRunner_StatusUnknownBatch(t *testing.T) {
	// Arrange
	r := NewBatchRunner(func(_ context.Context, _ CrawlTask) (TaskOutcome, error) {
		return TaskOutcome{}, nil
	}, 0)

	// Act
	_, ok := r.Status("nope")

	// Assert
	if ok {
		t.Error("未知批次应返回 ok=false")
	}
}

func TestBatchRunner_EmptyTasksRejected(t *testing.T) {
	// Arrange
	r := NewBatchRunner(func(_ context.Context, _ CrawlTask) (TaskOutcome, error) {
		return TaskOutcome{}, nil
	}, 0)

	// Act
	err := r.Enqueue("b1", nil)

	// Assert
	if err == nil {
		t.Error("空任务列表必须拒绝")
	}
}
