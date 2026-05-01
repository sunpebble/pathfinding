'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  CreditCard,
  Loader2,
  PlusCircle,
  Receipt,
  Scale,
  Search,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
} from '@/components/ui/dashboard-primitives';
import { useAuth } from '@/hooks/use-auth';
import { createApiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const expenseApi = createApiClient('/api/expense-splitting');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Member {
  id: string;
  name: string;
  userId?: string;
  isRegistered?: boolean;
}

interface Expense {
  id: string;
  itineraryId: string;
  paidByMemberId: string;
  paidByMemberName?: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  splitType: string;
  createdAt?: string;
}

interface ExpenseParticipant {
  memberId: string;
  amount?: number;
  percentage?: number;
}

interface Settlement {
  id: string;
  itineraryId: string;
  fromMemberId: string;
  fromMemberName?: string;
  toMemberId: string;
  toMemberName?: string;
  amount: number;
  currency: string;
  createdAt?: string;
}

interface BalanceEntry {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  balance: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'members', label: '成员', icon: Users },
  { key: 'expenses', label: '账单', icon: Receipt },
  { key: 'settlements', label: '结算', icon: ArrowRightLeft },
  { key: 'balance', label: '余额', icon: Scale },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const CATEGORIES = [
  { value: '餐饮', label: '餐饮' },
  { value: '交通', label: '交通' },
  { value: '住宿', label: '住宿' },
  { value: '景点', label: '景点' },
  { value: '购物', label: '购物' },
  { value: '其他', label: '其他' },
] as const;

const SPLIT_TYPES = [
  { value: 'equal', label: '平均分摊' },
  { value: 'percentage', label: '按比例' },
  { value: 'custom', label: '自定义' },
] as const;

// ---------------------------------------------------------------------------
// Shared UI Components
// ---------------------------------------------------------------------------

function Spinner({ className }: { className?: string }) {
  return <DashboardLoadingState className={className} label="加载中" />;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return <DashboardEmptyState icon={Icon} title={message} className="border-dashed" />;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <DashboardCard className="p-5">
      <h3 className="mb-4 text-base font-semibold text-stone-900">{title}</h3>
      {children}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// Members Tab
// ---------------------------------------------------------------------------

function MembersTab({
  itineraryId,
  members,
  isLoading,
}: {
  itineraryId: string;
  members: Member[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const addMember = useMutation({
    mutationFn: (newName: string) =>
      expenseApi.post<Member>('/members', {
        itineraryId,
        name: newName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-members', itineraryId] });
      setName('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed)
      return;
    addMember.mutate(trimmed);
  }

  return (
    <div className="space-y-6">
      {/* Add member form */}
      <SectionCard title="添加成员">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-1">
              姓名
            </label>
            <input
              id="member-name"
              type="text"
              placeholder="输入成员姓名"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || addMember.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            添加
          </button>
        </form>
        {addMember.isError && (
          <p className="mt-2 text-sm text-red-600">添加失败，请重试</p>
        )}
      </SectionCard>

      {/* Member list */}
      <SectionCard title="成员列表">
        {isLoading && <Spinner />}
        {!isLoading && members.length === 0 && (
          <EmptyState icon={Users} message="暂无成员，请先添加成员" />
        )}
        {!isLoading && members.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                  {member.isRegistered && (
                    <p className="text-xs text-gray-500">已注册用户</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses Tab
// ---------------------------------------------------------------------------

function ExpensesTab({
  itineraryId,
  members,
  expenses,
  isLoading,
}: {
  itineraryId: string;
  members: Member[];
  expenses: Expense[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();

  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [description, setDescription] = useState('');
  const [splitType, setSplitType] = useState<string>(SPLIT_TYPES[0].value);

  const addExpense = useMutation({
    mutationFn: (data: {
      itineraryId: string;
      paidByMemberId: string;
      amount: number;
      currency: string;
      category: string;
      description: string;
      splitType: string;
      participants?: ExpenseParticipant[];
    }) => expenseApi.post<Expense>('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['balance', itineraryId] });
      setPaidByMemberId('');
      setAmount('');
      setDescription('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (!paidByMemberId || Number.isNaN(parsed) || parsed <= 0)
      return;

    addExpense.mutate({
      itineraryId,
      paidByMemberId,
      amount: parsed,
      currency,
      category,
      description: description.trim(),
      splitType,
    });
  }

  const memberNameMap = new Map(members.map(m => [m.id, m.name]));

  const categoryLabel = (cat: string) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const splitTypeLabel = (st: string) => {
    const found = SPLIT_TYPES.find(s => s.value === st);
    return found ? found.label : st;
  };

  const canSubmit = paidByMemberId && amount && Number.parseFloat(amount) > 0;

  return (
    <div className="space-y-6">
      {/* Add expense form */}
      <SectionCard title="添加账单">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paid by */}
            <div>
              <label htmlFor="expense-paid-by" className="block text-sm font-medium text-gray-700 mb-1">
                付款人
              </label>
              <select
                id="expense-paid-by"
                value={paidByMemberId}
                onChange={e => setPaidByMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">请选择成员</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  金额
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="w-24">
                <label htmlFor="expense-currency" className="block text-sm font-medium text-gray-700 mb-1">
                  货币
                </label>
                <input
                  id="expense-currency"
                  type="text"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700 mb-1">
                类别
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Split type */}
            <div>
              <label htmlFor="expense-split-type" className="block text-sm font-medium text-gray-700 mb-1">
                分摊方式
              </label>
              <select
                id="expense-split-type"
                value={splitType}
                onChange={e => setSplitType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {SPLIT_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description — full width */}
          <div>
            <label htmlFor="expense-description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <input
              id="expense-description"
              type="text"
              placeholder="输入账单描述"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between">
            {addExpense.isError && (
              <p className="text-sm text-red-600">添加失败，请重试</p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || addExpense.isPending}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addExpense.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              添加账单
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Expense list */}
      <SectionCard title="账单列表">
        {isLoading && <Spinner />}
        {!isLoading && expenses.length === 0 && (
          <EmptyState icon={Receipt} message="暂无账单记录" />
        )}
        {!isLoading && expenses.length > 0 && (
          <div className="divide-y divide-gray-100">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {exp.description || '未命名账单'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {exp.paidByMemberName || memberNameMap.get(exp.paidByMemberId) || '未知'}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{categoryLabel(exp.category)}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{splitTypeLabel(exp.splitType)}</span>
                  </div>
                </div>
                <p className="ml-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {exp.currency}
                  {' '}
                  {exp.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settlements Tab
// ---------------------------------------------------------------------------

function SettlementsTab({
  itineraryId,
  members,
  settlements,
  isLoading,
}: {
  itineraryId: string;
  members: Member[];
  settlements: Settlement[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();

  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');

  const addSettlement = useMutation({
    mutationFn: (data: {
      itineraryId: string;
      fromMemberId: string;
      toMemberId: string;
      amount: number;
      currency: string;
    }) => expenseApi.post<Settlement>('/settlements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['balance', itineraryId] });
      setFromMemberId('');
      setToMemberId('');
      setAmount('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId || Number.isNaN(parsed) || parsed <= 0)
      return;

    addSettlement.mutate({
      itineraryId,
      fromMemberId,
      toMemberId,
      amount: parsed,
      currency,
    });
  }

  const memberNameMap = new Map(members.map(m => [m.id, m.name]));
  const canSubmit = fromMemberId && toMemberId && fromMemberId !== toMemberId && amount && Number.parseFloat(amount) > 0;

  return (
    <div className="space-y-6">
      {/* Add settlement form */}
      <SectionCard title="添加结算">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settlement-from" className="block text-sm font-medium text-gray-700 mb-1">
                付款方
              </label>
              <select
                id="settlement-from"
                value={fromMemberId}
                onChange={e => setFromMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">请选择成员</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settlement-to" className="block text-sm font-medium text-gray-700 mb-1">
                收款方
              </label>
              <select
                id="settlement-to"
                value={toMemberId}
                onChange={e => setToMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">请选择成员</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="settlement-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  金额
                </label>
                <input
                  id="settlement-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="w-24">
                <label htmlFor="settlement-currency" className="block text-sm font-medium text-gray-700 mb-1">
                  货币
                </label>
                <input
                  id="settlement-currency"
                  type="text"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {fromMemberId && toMemberId && fromMemberId === toMemberId && (
            <p className="text-sm text-amber-600">付款方和收款方不能是同一人</p>
          )}

          <div className="flex items-center justify-between">
            {addSettlement.isError && (
              <p className="text-sm text-red-600">添加失败，请重试</p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || addSettlement.isPending}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addSettlement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              添加结算
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Settlement list */}
      <SectionCard title="结算记录">
        {isLoading && <Spinner />}
        {!isLoading && settlements.length === 0 && (
          <EmptyState icon={ArrowRightLeft} message="暂无结算记录" />
        )}
        {!isLoading && settlements.length > 0 && (
          <div className="divide-y divide-gray-100">
            {settlements.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">
                    {s.fromMemberName || memberNameMap.get(s.fromMemberId) || '未知'}
                  </span>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium">
                    {s.toMemberName || memberNameMap.get(s.toMemberId) || '未知'}
                  </span>
                </div>
                <p className="ml-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {s.currency}
                  {' '}
                  {s.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance Tab
// ---------------------------------------------------------------------------

function BalanceTab({
  balances,
  isLoading,
}: {
  balances: BalanceEntry[];
  isLoading: boolean;
}) {
  return (
    <SectionCard title="余额总览">
      {isLoading && <Spinner />}
      {!isLoading && balances.length === 0 && (
        <EmptyState icon={Scale} message="暂无余额数据，请先添加成员和账单" />
      )}
      {!isLoading && balances.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">成员</th>
                <th className="pb-2 pr-4 font-medium text-right">已付</th>
                <th className="pb-2 pr-4 font-medium text-right">应付</th>
                <th className="pb-2 font-medium text-right">余额</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map(b => (
                <tr key={b.memberId}>
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{b.memberName}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-700">{b.totalPaid.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-700">{b.totalOwed.toFixed(2)}</td>
                  <td
                    className={cn(
                      'py-2.5 text-right font-semibold',
                      b.balance > 0 && 'text-green-600',
                      b.balance < 0 && 'text-red-600',
                      b.balance === 0 && 'text-gray-400',
                    )}
                  >
                    {b.balance > 0 ? '+' : ''}
                    {b.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExpensesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [itineraryId, setItineraryId] = useState('');
  const [activeId, setActiveId] = useState(''); // committed itinerary id for queries
  const [activeTab, setActiveTab] = useState<TabKey>('members');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [authLoading, isAuthenticated, router]);

  // ---------------------------------------------------------------------------
  // Queries — only fire when activeId is set
  // ---------------------------------------------------------------------------

  const membersQuery = useQuery({
    queryKey: ['expense-members', activeId],
    enabled: Boolean(activeId),
    queryFn: () => expenseApi.get<Member[]>(`/members?itineraryId=${activeId}`),
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', activeId],
    enabled: Boolean(activeId) && activeTab === 'expenses',
    queryFn: () => expenseApi.get<Expense[]>(`/expenses?itineraryId=${activeId}`),
  });

  const settlementsQuery = useQuery({
    queryKey: ['settlements', activeId],
    enabled: Boolean(activeId) && activeTab === 'settlements',
    queryFn: () => expenseApi.get<Settlement[]>(`/settlements?itineraryId=${activeId}`),
  });

  const balanceQuery = useQuery({
    queryKey: ['balance', activeId],
    enabled: Boolean(activeId) && activeTab === 'balance',
    queryFn: () => expenseApi.get<BalanceEntry[]>(`/balance?itineraryId=${activeId}`),
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = itineraryId.trim();
    if (!trimmed)
      return;
    setActiveId(trimmed);
    setActiveTab('members');
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <DashboardPageHeader
        title="费用分摊"
        description="管理旅行中的共享开支与结算"
        icon={Receipt}
      />

      {/* Itinerary selector */}
      <form onSubmit={handleQuery} className="dashboard-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end">
        <div className="flex-1 max-w-md">
          <label htmlFor="itinerary-id" className="mb-1 block text-sm font-medium text-stone-700">
            行程 ID
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="itinerary-id"
              type="text"
              placeholder="输入行程 ID"
              value={itineraryId}
              onChange={e => setItineraryId(e.target.value)}
              className="dashboard-control w-full py-2 pl-10 pr-4"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!itineraryId.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
        >
          查询
        </button>
      </form>

      {/* Main content — only visible after selecting an itinerary */}
      {activeId && (
        <>
          {/* Tabs */}
          <div className="dashboard-surface rounded-2xl px-3 pt-3">
            <nav className="flex gap-3 overflow-x-auto" aria-label="Tabs">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-t-xl border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors',
                    activeTab === key
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-700'
                      : 'border-transparent text-stone-500 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab panels */}
          {activeTab === 'members' && (
            <MembersTab
              itineraryId={activeId}
              members={membersQuery.data ?? []}
              isLoading={membersQuery.isLoading}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesTab
              itineraryId={activeId}
              members={membersQuery.data ?? []}
              expenses={expensesQuery.data ?? []}
              isLoading={expensesQuery.isLoading}
            />
          )}

          {activeTab === 'settlements' && (
            <SettlementsTab
              itineraryId={activeId}
              members={membersQuery.data ?? []}
              settlements={settlementsQuery.data ?? []}
              isLoading={settlementsQuery.isLoading}
            />
          )}

          {activeTab === 'balance' && (
            <BalanceTab
              balances={balanceQuery.data ?? []}
              isLoading={balanceQuery.isLoading}
            />
          )}
        </>
      )}

      {/* Placeholder when no itinerary selected */}
      {!activeId && (
        <DashboardEmptyState
          icon={Receipt}
          title="请输入行程 ID 后点击&quot;查询&quot;开始管理费用"
          className="border-dashed py-16"
        />
      )}
    </div>
  );
}
