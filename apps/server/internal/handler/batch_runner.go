// batch_runner.go 实现批量爬取任务的顺序消费（设计 D12）。
//
// 取代「发布 crawler.mafengwo.batch.task.created 事件后无人消费」的静默假成功路径：
// POST /batch 把任务直接入队（容量不足时整体拒绝、立即可见），单 goroutine 顺序
// 执行并按 CRAWLER_RATE_LIMIT_SECONDS 限速，每个任务的 success/fail/原因可通过
// GET /api/crawler/mafengwo/batch/{batchId} 查询。
package handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// 批量任务类型（与 POST /batch 的 taskType 一致）。
const (
	taskTypeDestinationDetail = "destination_detail"
	taskTypeTravelNoteList    = "travel_note_list"
	taskTypePOIList           = "poi_list"
	taskTypeGuideList         = "guide_list"
	taskTypeQAList            = "qa_list"
	taskTypeRanking           = "ranking"
)

// CrawlTask 是批量爬取的单个任务描述。
type CrawlTask struct {
	TaskType        string `json:"taskType"`
	DestinationID   string `json:"destinationId"`
	DestinationName string `json:"destinationName"`
	Priority        int    `json:"priority"`
	Category        string `json:"category,omitempty"`
	RankingType     string `json:"rankingType,omitempty"`
	ScrollCount     int    `json:"scrollCount,omitempty"`
	CrawlDetails    bool   `json:"crawlDetails,omitempty"`
	DetailsLimit    int    `json:"detailsLimit,omitempty"`
}

// TaskOutcome 汇总单个任务的执行结果，透出到状态查询接口。
type TaskOutcome struct {
	Found          int      `json:"found"`
	DetailsCrawled int      `json:"detailsCrawled,omitempty"`
	Saved          int      `json:"saved"`
	Failed         int      `json:"failed"`
	SaveErrors     []string `json:"saveErrors,omitempty"`
	Note           string   `json:"note,omitempty"`
}

// TaskExecutor 执行单个爬取任务。
type TaskExecutor func(ctx context.Context, task CrawlTask) (TaskOutcome, error)

// 任务状态。
const (
	TaskStatusPending   = "pending"
	TaskStatusRunning   = "running"
	TaskStatusSucceeded = "succeeded"
	TaskStatusFailed    = "failed"
)

// TaskResult 是单个任务的执行记录。
type TaskResult struct {
	Task       CrawlTask    `json:"task"`
	Status     string       `json:"status"`
	Error      string       `json:"error,omitempty"`
	Outcome    *TaskOutcome `json:"outcome,omitempty"`
	StartedAt  *time.Time   `json:"startedAt,omitempty"`
	FinishedAt *time.Time   `json:"finishedAt,omitempty"`
}

// BatchStatus 是批次执行状态快照。
type BatchStatus struct {
	BatchID    string       `json:"batchId"`
	CreatedAt  time.Time    `json:"createdAt"`
	TotalTasks int          `json:"totalTasks"`
	Pending    int          `json:"pending"`
	Running    int          `json:"running"`
	Succeeded  int          `json:"succeeded"`
	Failed     int          `json:"failed"`
	Tasks      []TaskResult `json:"tasks"`
}

const (
	// batchQueueCapacity 限制总待执行任务数（50 目的地 × 全数据类型 ≈ 500，留余量）。
	batchQueueCapacity = 1024
	// maxTrackedBatches 限制内存中保留的批次状态数量，超限时优先淘汰已完结批次。
	maxTrackedBatches = 50
	// defaultTaskTimeout 限定单个任务（含内部详情爬取与限速等待）的最长执行时间。
	defaultTaskTimeout = 30 * time.Minute
)

type queueRef struct {
	batchID string
	index   int
}

type batchRecord struct {
	id        string
	createdAt time.Time
	tasks     []*TaskResult
}

// finished 报告批次是否已无待执行/执行中的任务（调用方必须持有 BatchRunner.mu）。
func (b *batchRecord) finished() bool {
	for _, t := range b.tasks {
		if t.Status == TaskStatusPending || t.Status == TaskStatusRunning {
			return false
		}
	}
	return true
}

// BatchRunner 顺序消费批量爬取任务，任务间隔 interval（≥ CRAWLER_RATE_LIMIT_SECONDS）。
type BatchRunner struct {
	exec        TaskExecutor
	interval    time.Duration
	sleep       func(time.Duration) // 可注入，测试限速逻辑用
	taskTimeout time.Duration

	queue chan queueRef
	done  chan struct{}
	wg    sync.WaitGroup

	mu      sync.Mutex
	batches map[string]*batchRecord
	order   []string // 注册顺序，用于淘汰最旧的已完结批次
}

// NewBatchRunner 创建批量任务消费者。interval <= 0 表示不限速（仅测试场景）。
func NewBatchRunner(exec TaskExecutor, interval time.Duration) *BatchRunner {
	return &BatchRunner{
		exec:        exec,
		interval:    interval,
		sleep:       time.Sleep,
		taskTimeout: defaultTaskTimeout,
		queue:       make(chan queueRef, batchQueueCapacity),
		done:        make(chan struct{}),
		batches:     make(map[string]*batchRecord),
	}
}

// Start 启动消费 goroutine。
func (r *BatchRunner) Start() {
	r.wg.Add(1)
	go r.loop()
	slog.Info("batch runner started", "interval", r.interval.String(), "queueCapacity", batchQueueCapacity)
}

// Stop 停止消费并等待当前任务结束。未执行的任务保持 pending（状态可查）。
func (r *BatchRunner) Stop() {
	close(r.done)
	r.wg.Wait()
	slog.Info("batch runner stopped")
}

func (r *BatchRunner) loop() {
	defer r.wg.Done()
	for {
		select {
		case <-r.done:
			return
		case ref := <-r.queue:
			r.runTask(ref)
			if r.interval > 0 {
				r.sleep(r.interval)
			}
		}
	}
}

// Enqueue 注册批次并把全部任务入队。队列容量不足或活跃批次过多时整体拒绝
// 并返回错误（绝不部分入队，失败必须对调用方可见）。
func (r *BatchRunner) Enqueue(batchID string, tasks []CrawlTask) error {
	if len(tasks) == 0 {
		return errors.New("batch: no tasks to enqueue")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.batches[batchID]; exists {
		return fmt.Errorf("batch: duplicate batch id %s", batchID)
	}
	if free := cap(r.queue) - len(r.queue); len(tasks) > free {
		return fmt.Errorf("batch: queue full (%d tasks requested, %d slots free)", len(tasks), free)
	}
	r.evictFinishedLocked()
	if len(r.order) >= maxTrackedBatches {
		return fmt.Errorf("batch: too many active batches (%d), retry later", len(r.order))
	}

	record := &batchRecord{id: batchID, createdAt: time.Now(), tasks: make([]*TaskResult, len(tasks))}
	for i, task := range tasks {
		record.tasks[i] = &TaskResult{Task: task, Status: TaskStatusPending}
	}
	r.batches[batchID] = record
	r.order = append(r.order, batchID)

	// 容量已在持锁状态下校验，发送不会阻塞。
	for i := range tasks {
		r.queue <- queueRef{batchID: batchID, index: i}
	}
	return nil
}

// evictFinishedLocked 淘汰最旧的已完结批次直至低于上限（调用方必须持有 mu）。
// 未完结的批次绝不淘汰，避免丢失执行状态。
func (r *BatchRunner) evictFinishedLocked() {
	for len(r.order) >= maxTrackedBatches {
		evicted := false
		for i, id := range r.order {
			if r.batches[id].finished() {
				delete(r.batches, id)
				r.order = append(r.order[:i], r.order[i+1:]...)
				evicted = true
				break
			}
		}
		if !evicted {
			return
		}
	}
}

func (r *BatchRunner) runTask(ref queueRef) {
	r.mu.Lock()
	record := r.batches[ref.batchID]
	if record == nil {
		// 只有已完结批次会被淘汰，理论上不会有残留任务；防御性跳过并留日志。
		r.mu.Unlock()
		slog.Error("batch task references evicted batch, skipped", "batchId", ref.batchID, "index", ref.index)
		return
	}
	taskResult := record.tasks[ref.index]
	started := time.Now()
	taskResult.Status = TaskStatusRunning
	taskResult.StartedAt = &started
	task := taskResult.Task
	r.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), r.taskTimeout)
	outcome, err := r.exec(ctx, task)
	cancel()

	r.mu.Lock()
	defer r.mu.Unlock()
	finished := time.Now()
	taskResult.FinishedAt = &finished
	if err != nil {
		taskResult.Status = TaskStatusFailed
		taskResult.Error = err.Error()
		slog.Error("batch task failed",
			"batchId", ref.batchID,
			"taskType", task.TaskType,
			"destinationId", task.DestinationID,
			"error", err,
		)
		return
	}
	result := outcome
	taskResult.Outcome = &result
	taskResult.Status = TaskStatusSucceeded
	slog.Info("batch task completed",
		"batchId", ref.batchID,
		"taskType", task.TaskType,
		"destinationId", task.DestinationID,
		"found", result.Found,
		"saved", result.Saved,
		"failed", result.Failed,
	)
}

// Status 返回批次执行状态快照；批次不存在（或已淘汰）时 ok=false。
func (r *BatchRunner) Status(batchID string) (*BatchStatus, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	record := r.batches[batchID]
	if record == nil {
		return nil, false
	}

	status := &BatchStatus{
		BatchID:    record.id,
		CreatedAt:  record.createdAt,
		TotalTasks: len(record.tasks),
		Tasks:      make([]TaskResult, len(record.tasks)),
	}
	for i, t := range record.tasks {
		status.Tasks[i] = *t
		switch t.Status {
		case TaskStatusPending:
			status.Pending++
		case TaskStatusRunning:
			status.Running++
		case TaskStatusSucceeded:
			status.Succeeded++
		case TaskStatusFailed:
			status.Failed++
		}
	}
	return status, true
}
