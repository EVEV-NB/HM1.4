// Supabase配置：连接到Supabase数据库的必要信息
const SUPABASE_URL = 'https://agvezeuegoqzjcclqgfe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndmV6ZXVlZ29xempjY2xxZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjUzNTMsImV4cCI6MjA5MDUwMTM1M30.3SQsJrDaoH86WsHAPLFVyTWLnKg298lRuGAgReMvPzg';

// 初始化Supabase客户端：创建与Supabase数据库的连接
let supabaseClient;

// 等待DOM加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      console.error('不在浏览器环境中');
      return;
    }
    
    // 检查supabase库是否已加载
    if (!window.supabase) {
      console.error('Supabase库未加载');
      // 尝试重新加载Supabase库
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = async () => {
        console.log('Supabase库重新加载成功');
        initSupabaseClient();
      };
      script.onerror = () => {
        console.error('重新加载Supabase库失败');
        alert('Supabase库加载失败，请检查网络连接');
      };
      document.head.appendChild(script);
    } else {
      // Supabase库已加载，初始化客户端
      initSupabaseClient();
    }
  } catch (error) {
    console.error('初始化Supabase客户端失败:', error);
    alert('初始化Supabase客户端失败: ' + error.message);
  }
});

// 初始化Supabase客户端函数
function initSupabaseClient() {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase客户端初始化成功');
    // 初始化完成后检查连接状态
    checkSupabaseStatus();
    // 调用init函数，初始化页面
    init();
  } catch (error) {
    console.error('创建Supabase客户端失败:', error);
    alert('创建Supabase客户端失败: ' + error.message);
  }
}

// 检查Supabase连接和表结构：确保数据库连接正常
async function checkSupabaseStatus() {
  if (!supabaseClient) {
    console.error('Supabase客户端未初始化');
    return;
  }
  
  try {
    console.log('检查Supabase连接...');
    
    // 检查认证状态
    if (supabaseClient.auth) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      console.log('用户状态:', user ? '已登录' : '未登录');
    } else {
      console.error('Supabase客户端缺少auth属性');
      return;
    }
    
    // 检查records表是否存在
    console.log('检查records表...');
    const { data, error } = await supabaseClient
      .from('records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('检查records表失败:', error);
      alert('检查records表失败: ' + error.message);
      return;
    }
    
    console.log('检查records表成功:', data);
  } catch (error) {
    console.error('检查Supabase状态失败:', error);
    alert('检查Supabase状态失败: ' + error.message);
  }
}

// 全局变量：存储当前用户和记录数据
let currentUser = null; // 当前登录用户
let records = []; // 出库记录数据

// DOM 元素：存储页面上的HTML元素
let emailEl, passwordEl, loginBtn, authInfoEl, rememberMeEl;
let loginSection, userInfo, userEmail, logoutBtnHeader;
let addRecordSection, filterSection, summarySection, recordsTable, recipientSection;

// 初始化函数：页面加载时执行
async function init() {
  // 获取DOM元素
  emailEl = document.getElementById('email'); // 邮箱输入框
  passwordEl = document.getElementById('password'); // 密码输入框
  loginBtn = document.getElementById('loginBtn'); // 登录按钮
  authInfoEl = document.getElementById('authInfo'); // 认证信息显示
  rememberMeEl = document.getElementById('rememberMe'); // 记住密码复选框
  loginSection = document.getElementById('loginSection'); // 登录区域
  userInfo = document.getElementById('userInfo'); // 用户信息区域
  userEmail = document.getElementById('userEmail'); // 用户邮箱显示
  logoutBtnHeader = document.getElementById('logoutBtnHeader'); // 退出登录按钮

  // 绑定事件监听器
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin); // 登录按钮点击事件
  }
  if (logoutBtnHeader) {
    logoutBtnHeader.addEventListener('click', handleLogout); // 退出登录按钮点击事件
  }

  // 检查是否保存了账号密码
  const savedCredentials = localStorage.getItem('savedCredentials');
  if (savedCredentials) {
    try {
      const credentials = JSON.parse(savedCredentials);
      emailEl.value = credentials.email || ''; // 填充邮箱
      passwordEl.value = credentials.password || ''; // 填充密码
      if (rememberMeEl) rememberMeEl.checked = true; // 勾选记住密码
    } catch (e) {
      console.error('解析保存的账号密码失败:', e);
      localStorage.removeItem('savedCredentials'); // 清除无效的保存数据
    }
  }

  // 检查Supabase连接状态
  await checkSupabaseStatus();
  
  // 检查Supabase中的用户会话
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      currentUser = user;
      setAuthUI(currentUser); // 设置登录状态UI
      await loadRecords(); // 加载记录
    }
  } catch (error) {
    console.error('检查用户会话失败:', error);
  }
}

// 设置认证UI：根据登录状态显示/隐藏不同界面
const setAuthUI = (user) => {
  workdaySection = document.getElementById('workdaySection'); // 工天记录入口
  addRecordSection = document.getElementById('addRecordSection'); // 添加记录区域
  filterSection = document.getElementById('filterSection'); // 过滤区域
  summarySection = document.getElementById('summarySection'); // 汇总区域
  recordsTable = document.getElementById('recordsTable'); // 记录表格
  recipientSection = document.getElementById('recipientSection'); // 提货人统计区域

  if (user) {
    // 登录状态：隐藏登录界面，显示用户信息和功能模块
    if (loginSection) loginSection.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      if (userEmail) userEmail.textContent = user.email; // 显示用户邮箱
    }
    if (workdaySection) workdaySection.style.display = 'block';
    if (addRecordSection) addRecordSection.style.display = 'block';
    if (filterSection) filterSection.style.display = 'block';
    if (summarySection) summarySection.style.display = 'block';
    if (recordsTable) recordsTable.style.display = 'block';
    if (recipientSection) recipientSection.style.display = 'block';
    displayRecords(); // 显示记录
    updateSummaries(); // 更新汇总信息
  } else {
    // 未登录状态：显示登录界面，隐藏用户信息和功能模块
    if (loginSection) loginSection.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (addRecordSection) addRecordSection.style.display = 'none';
    if (filterSection) filterSection.style.display = 'none';
    if (summarySection) summarySection.style.display = 'none';
    if (recordsTable) recordsTable.style.display = 'none';
  }
};

// 处理登录：用户登录逻辑
const handleLogin = async () => {
  const email = emailEl.value.trim(); // 获取邮箱输入
  const password = passwordEl.value.trim(); // 获取密码输入
  const rememberMe = rememberMeEl ? rememberMeEl.checked : false; // 获取是否记住密码
  
  if (!email || !password) {
    if (authInfoEl) authInfoEl.textContent = '请输入邮箱和密码';
    return;
  }

  // 检查Supabase客户端是否初始化
  if (!supabaseClient) {
    if (authInfoEl) authInfoEl.textContent = '登录失败: Supabase客户端未初始化';
    return;
  }

  try {
    // 使用Supabase进行登录
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (authInfoEl) authInfoEl.textContent = '登录失败: ' + error.message;
      return;
    }
    
    currentUser = data.user; // 保存当前用户
    
    // 根据是否勾选记住账号密码来决定是否保存
    if (rememberMe) {
      localStorage.setItem('savedCredentials', JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem('savedCredentials');
    }
    
    setAuthUI(currentUser); // 设置登录状态UI
    await loadRecords(); // 加载记录
  } catch (error) {
    if (authInfoEl) authInfoEl.textContent = '登录失败: ' + error.message;
  }
};

// 处理登出：用户退出登录逻辑
const handleLogout = async () => {
  try {
    await supabaseClient.auth.signOut(); // 调用Supabase登出方法
    currentUser = null; // 清空当前用户
    
    // 如果没有勾选记住账号密码，则清空输入框
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (!savedCredentials) {
      if (emailEl) emailEl.value = '';
      if (passwordEl) passwordEl.value = '';
      if (rememberMeEl) rememberMeEl.checked = false;
    }
    
    setAuthUI(null); // 设置未登录状态UI
  } catch (error) {
    console.error('登出失败:', error);
  }
};

// 从Supabase加载记录：获取所有出库记录
const loadRecords = async () => {
  if (!supabaseClient) {
    console.error('Supabase客户端未初始化');
    alert('Supabase客户端未初始化');
    return;
  }
  
  try {
    console.log('开始加载记录...');
    const { data, error } = await supabaseClient
      .from('records') // 从records表获取数据
      .select('*') // 选择所有字段
      .order('created_at', { ascending: false }); // 按创建时间降序排序
    
    if (error) {
      console.error('加载记录失败:', error);
      alert('加载记录失败: ' + error.message);
      return;
    }
    
    console.log('加载记录成功:', data);
    records = data; // 保存记录数据
    displayRecords(); // 显示记录
    updateSummaries(); // 更新汇总信息
  } catch (error) {
    console.error('加载记录失败:', error);
    alert('加载记录失败: ' + error.message);
  }
};

// 添加记录：添加新的出库记录
async function addRecord() {
  const date = document.getElementById('date').value; // 获取日期
  const model = document.getElementById('model').value.trim(); // 获取型号
  const recipient = document.getElementById('recipient').value.trim(); // 获取提货人
  const quantity = parseFloat(document.getElementById('quantity').value); // 获取数量
  const price = parseFloat(document.getElementById('price').value); // 获取单价
  const subtotal = parseFloat(document.getElementById('subtotal').value); // 获取小计
  const paymentStatus = document.getElementById('paymentStatus').value === 'true'; // 获取付款状态，将字符串值转换为布尔值
  const remark = document.getElementById('remark').value.trim(); // 获取备注

  // 验证必填字段
  if (!date || !model || !recipient || isNaN(quantity) || isNaN(price)) {
    alert('请填写所有必填字段！');
    return;
  }

  try {
    // 向Supabase添加记录
    const { data, error } = await supabaseClient
      .from('records')
      .insert({
        date: date,
        model: model,
        recipient: recipient,
        quantity: quantity,
        price: price,
        subtotal: subtotal,
        paymentStatus: paymentStatus,
        remark: remark
      })
      .select(); // 返回插入的记录
    
    if (error) {
      console.error('添加记录失败:', error);
      alert('添加记录失败: ' + error.message);
      return;
    }
    
    await loadRecords(); // 重新加载记录
    clearForm(); // 清空表单
    showToast('添加成功'); // 显示添加成功提示
  } catch (error) {
    console.error('添加记录失败:', error);
    alert('添加记录失败: ' + error.message);
  }
}

// 显示记录：在表格中显示出库记录
function displayRecords(filteredRecords = null) {
  const displayRecords = filteredRecords || records; // 使用过滤后的记录或全部记录
  const tbody = document.getElementById('recordsBody'); // 获取表格主体
  if (!tbody) return;
  
  tbody.innerHTML = ''; // 清空表格内容

  // 按日期降序排序
  displayRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 遍历记录，创建表格行
  displayRecords.forEach(record => {
    const row = document.createElement('tr'); // 创建新行
    row.innerHTML = `
      <td>${formatDate(record.date)}</td> <!-- 日期 -->
      <td>${record.model}</td> <!-- 型号 -->
      <td>${record.recipient}</td> <!-- 提货人 -->
      <td>${record.quantity}</td> <!-- 数量 -->
      <td>¥${record.price.toFixed(2)}</td> <!-- 单价 -->
      <td>¥${record.subtotal.toFixed(2)}</td> <!-- 小计 -->
      <td>${record.remark || '-'}</td> <!-- 备注 -->
      <td><input type="checkbox" ${Boolean(record.paymentStatus) ? 'checked' : ''} onchange="updatePaymentStatus(${record.id}, this.checked)"></td> <!-- 付款状态 -->
      <td><button class="delete-btn" onclick="deleteRecord(${record.id})")">删除</button></td> <!-- 删除按钮 -->
    `;
    tbody.appendChild(row); // 添加行到表格
  });
}

// 删除记录：删除指定ID的出库记录
async function deleteRecord(id) {
  const record = records.find(record => record.id === id); // 查找要删除的记录
  if (record) {
    const paymentStatus = record.paymentStatus ? '已付款' : '未付款'; // 付款状态文本
    const confirmMessage = `确定要删除这条出库记录吗？\n\n` +
      `日期: ${formatDate(record.date)}\n` +
      `型号: ${record.model}\n` +
      `提货人: ${record.recipient}\n` +
      `数量: ${record.quantity}\n` +
      `单价: ¥${record.price.toFixed(2)}\n` +
      `小计: ¥${record.subtotal.toFixed(2)}\n` +
      `付款状态: ${paymentStatus}\n\n` +
      `注意：删除后无法恢复！`;

    if (confirm(confirmMessage)) { // 确认删除
      try {
        // 从Supabase删除记录
        const { error } = await supabaseClient
          .from('records')
          .delete()
          .eq('id', id); // 按ID删除
        
        if (error) {
          console.error('删除记录失败:', error);
          alert('删除记录失败: ' + error.message);
          return;
        }
        
        await loadRecords(); // 重新加载记录
      } catch (error) {
        console.error('删除记录失败:', error);
        alert('删除记录失败: ' + error.message);
      }
    }
  }
}

// 更新付款状态：更新指定记录的付款状态
async function updatePaymentStatus(id, status) {
  const record = records.find(record => record.id === id); // 查找要更新的记录
  if (record) {
    const currentStatus = Boolean(record.paymentStatus) ? '已付款' : '未付款'; // 当前状态
    const newStatus = status ? '已付款' : '未付款'; // 新状态
    const confirmMessage = `确认要将以下记录的付款状态从"${currentStatus}"更改为"${newStatus}"吗？\n\n` +
      `日期: ${formatDate(record.date)}\n` +
      `型号: ${record.model}\n` +
      `提货人: ${record.recipient}\n` +
      `金额: ¥${record.subtotal.toFixed(2)}`;

    if (confirm(confirmMessage)) { // 确认更新
      try {
        // 更新Supabase中的付款状态
        const { error } = await supabaseClient
          .from('records')
          .update({ paymentStatus: status })
          .eq('id', id); // 按ID更新
        
        if (error) {
          console.error('更新付款状态失败:', error);
          alert('更新付款状态失败: ' + error.message);
          // 重新显示记录以恢复复选框状态
          displayRecords();
          return;
        }
        
        await loadRecords(); // 重新加载记录
      } catch (error) {
        console.error('更新付款状态失败:', error);
        alert('更新付款状态失败: ' + error.message);
        // 重新显示记录以恢复复选框状态
        displayRecords();
      }
    } else {
      // 如果用户取消，重新显示记录以恢复复选框状态
      displayRecords();
    }
  }
}

// 应用过滤：根据条件过滤记录
function applyFilters() {
  const filterDate = document.getElementById('filterDate').value; // 日期过滤
  const filterModel = document.getElementById('filterModel').value.toLowerCase().trim(); // 型号过滤
  const filterRecipient = document.getElementById('filterRecipient').value.toLowerCase().trim(); // 提货人过滤
  const filterPayment = document.getElementById('filterPayment').value; // 付款状态过滤

  let filteredRecords = records; // 初始为所有记录

  // 按日期过滤
  if (filterDate) {
    filteredRecords = filteredRecords.filter(record => record.date === filterDate);
  }

  // 按型号过滤（包含关键词）
  if (filterModel) {
    filteredRecords = filteredRecords.filter(record =>
      record.model.toLowerCase().includes(filterModel)
    );
  }

  // 按提货人过滤（包含关键词）
  if (filterRecipient) {
    filteredRecords = filteredRecords.filter(record =>
      record.recipient.toLowerCase().includes(filterRecipient)
    );
  }

  // 按付款状态过滤
  if (filterPayment) {
    if (filterPayment === 'paid') {
      filteredRecords = filteredRecords.filter(record => record.paymentStatus);
    } else if (filterPayment === 'unpaid') {
      filteredRecords = filteredRecords.filter(record => !record.paymentStatus);
    }
  }

  displayRecords(filteredRecords); // 显示过滤后的记录
}

// 清除过滤：重置所有过滤条件
function clearFilters() {
  // 清空所有过滤输入
  document.getElementById('filterDate').value = '';
  document.getElementById('filterModel').value = '';
  document.getElementById('filterRecipient').value = '';
  document.getElementById('filterPayment').value = '';
  displayRecords(); // 显示所有记录
}

// 更新汇总：计算并显示各种汇总数据
function updateSummaries() {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // 今天的日期（YYYY-MM-DD格式）
  const currentYear = now.getFullYear(); // 当前年份
  const currentMonth = now.getMonth(); // 当前月份（0-11）
  const currentQuarter = Math.floor(currentMonth / 3); // 当前季度（0-3）

  // 今日合计
  const dailyTotal = records
    .filter(record => record.date === today)
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 本周合计（当前周）
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // 本周开始（周日）
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 本周结束（周六）

  const weeklyTotal = records
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startOfWeek && recordDate <= endOfWeek;
    })
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 本月合计
  const monthlyTotal = records
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === currentYear &&
             recordDate.getMonth() === currentMonth;
    })
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 本季度合计
  const quarterlyTotal = records
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === currentYear &&
             Math.floor(recordDate.getMonth() / 3) === currentQuarter;
    })
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 今年合计
  const yearlyTotal = records
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === currentYear;
    })
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 已付款合计
  const paidTotal = records
    .filter(record => record.paymentStatus)
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 未付款合计
  const unpaidTotal = records
    .filter(record => !record.paymentStatus)
    .reduce((sum, record) => sum + record.subtotal, 0);

  // 更新UI显示
  const dailyTotalEl = document.getElementById('dailyTotal');
  const weeklyTotalEl = document.getElementById('weeklyTotal');
  const monthlyTotalEl = document.getElementById('monthlyTotal');
  const quarterlyTotalEl = document.getElementById('quarterlyTotal');
  const yearlyTotalEl = document.getElementById('yearlyTotal');
  const paidTotalEl = document.getElementById('paidTotal');
  const unpaidTotalEl = document.getElementById('unpaidTotal');

  if (dailyTotalEl) dailyTotalEl.textContent = `¥${dailyTotal.toFixed(2)}`;
  if (weeklyTotalEl) weeklyTotalEl.textContent = `¥${weeklyTotal.toFixed(2)}`;
  if (monthlyTotalEl) monthlyTotalEl.textContent = `¥${monthlyTotal.toFixed(2)}`;
  if (quarterlyTotalEl) quarterlyTotalEl.textContent = `¥${quarterlyTotal.toFixed(2)}`;
  if (yearlyTotalEl) yearlyTotalEl.textContent = `¥${yearlyTotal.toFixed(2)}`;
  if (paidTotalEl) paidTotalEl.textContent = `¥${paidTotal.toFixed(2)}`;
  if (unpaidTotalEl) unpaidTotalEl.textContent = `¥${unpaidTotal.toFixed(2)}`;
  
  // 更新提货人统计
  updateRecipientStats();
}

// 导出CSV：将记录导出为CSV文件
function exportToCSV() {
  const headers = ['日期', '型号', '提货人', '数量', '单价', '小计', '备注', '付款状态']; // CSV表头
  const csvContent = [
    headers.join(','), // 表头行
    ...records.map(record => [ // 数据行
      record.date,
      `"${record.model}"`, // 用引号包裹可能包含逗号的字段
      `"${record.recipient}"`, // 用引号包裹可能包含逗号的字段
      record.quantity,
      record.price.toFixed(2),
      record.subtotal.toFixed(2),
      `"${record.remark || ''}"`, // 用引号包裹可能包含逗号的字段
      record.paymentStatus ? '已付款' : '未付款'
    ].join(','))
  ].join('\n'); // 行之间用换行符分隔

  // 创建Blob对象并下载
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `库存记录_${new Date().toISOString().split('T')[0]}.csv`); // 文件名包含当前日期
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click(); // 触发下载
  document.body.removeChild(link); // 清理
}

// 清空表单：清空添加记录表单的所有输入
function clearForm() {
  const dateEl = document.getElementById('date');
  const modelEl = document.getElementById('model');
  const recipientEl = document.getElementById('recipient');
  const quantityEl = document.getElementById('quantity');
  const priceEl = document.getElementById('price');
  const subtotalEl = document.getElementById('subtotal');
  const remarkEl = document.getElementById('remark');
  const paymentStatusEl = document.getElementById('paymentStatus');

  if (dateEl) dateEl.value = '';
  if (modelEl) modelEl.value = '';
  if (recipientEl) recipientEl.value = '';
  if (quantityEl) quantityEl.value = '';
  if (priceEl) priceEl.value = '';
  if (subtotalEl) subtotalEl.value = '';
  if (remarkEl) remarkEl.value = '';
  if (paymentStatusEl) paymentStatusEl.value = 'false';
}

// 格式化日期显示：将日期字符串格式化为中文日期格式
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 打开详细记录模态框
function openDetailModal(type) {
  // 获取模态框元素
  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalTotal = document.getElementById('modalTotal');
  const modalTableBody = document.getElementById('modalTableBody');
  
  // 设置模态框标题
  let title = '';
  switch (type) {
    case 'paid':
      title = '已付款详细记录';
      break;
    case 'unpaid':
      title = '未付款详细记录';
      break;
    case 'daily':
      title = '今日详细记录';
      break;
    case 'weekly':
      title = '本周详细记录';
      break;
    case 'monthly':
      title = '本月详细记录';
      break;
    case 'quarterly':
      title = '本季度详细记录';
      break;
    case 'yearly':
      title = '今年详细记录';
      break;
    default:
      title = '详细记录';
  }
  modalTitle.textContent = title;
  
  // 过滤记录
  let filteredRecords = [];
  let total = 0;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log('开始过滤记录，类型:', type);
  console.log('总记录数:', records.length);
  
  for (const record of records) {
    const recordDate = new Date(record.date);
    let include = false;
    
    switch (type) {
      case 'paid':
        include = Boolean(record.paymentStatus) === true;
        break;
      case 'unpaid':
        include = Boolean(record.paymentStatus) === false;
        break;
      case 'daily':
        include = recordDate >= today;
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        include = recordDate >= weekStart;
        break;
      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        include = recordDate >= monthStart;
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        include = recordDate >= quarterStart;
        break;
      case 'yearly':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        include = recordDate >= yearStart;
        break;
    }
    
    console.log('记录:', record.recipient, '付款状态:', record.paymentStatus, '布尔值:', Boolean(record.paymentStatus), '是否包含:', include);
    
    if (include) {
      filteredRecords.push(record);
      total += record.subtotal;
    }
  }
  
  console.log('过滤后记录数:', filteredRecords.length, '合计:', total);
  
  // 设置合计金额
  modalTotal.textContent = `¥${total.toFixed(2)}`;
  
  // 填充表格
  modalTableBody.innerHTML = '';
  if (filteredRecords.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = '暂无记录';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    row.appendChild(cell);
    modalTableBody.appendChild(row);
  } else {
    for (const record of filteredRecords) {
      const row = document.createElement('tr');
      
      // 日期
      const dateCell = document.createElement('td');
      dateCell.textContent = record.date;
      row.appendChild(dateCell);
      
      // 型号
      const modelCell = document.createElement('td');
      modelCell.textContent = record.model;
      row.appendChild(modelCell);
      
      // 提货人
      const recipientCell = document.createElement('td');
      recipientCell.textContent = record.recipient;
      row.appendChild(recipientCell);
      
      // 数量
      const quantityCell = document.createElement('td');
      quantityCell.textContent = record.quantity;
      row.appendChild(quantityCell);
      
      // 单价
      const priceCell = document.createElement('td');
      priceCell.textContent = `¥${record.price.toFixed(2)}`;
      row.appendChild(priceCell);
      
      // 小计
      const subtotalCell = document.createElement('td');
      subtotalCell.textContent = `¥${record.subtotal.toFixed(2)}`;
      row.appendChild(subtotalCell);
      
      // 备注
      const remarkCell = document.createElement('td');
      remarkCell.textContent = record.remark || '-';
      row.appendChild(remarkCell);
      
      // 付款状态
      const paidCell = document.createElement('td');
      paidCell.textContent = Boolean(record.paymentStatus) ? '已付款' : '未付款';
      paidCell.style.color = Boolean(record.paymentStatus) ? '#28a745' : '#dc3545';
      paidCell.style.fontWeight = '500';
      row.appendChild(paidCell);
      
      modalTableBody.appendChild(row);
    }
  }
  
  // 显示模态框
  modal.style.display = 'block';
}

// 关闭详细记录模态框
function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  modal.style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
  const modal = document.getElementById('detailModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// 显示提示框
function showToast(message = '添加成功') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hide');
  
  // 0.8秒后隐藏提示框
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }, 800);
}

// 更新提货人统计
function updateRecipientStats() {
  // 计算每个提货人的合计金额
  const recipientStats = {};
  
  for (const record of records) {
    const recipient = record.recipient;
    if (!recipientStats[recipient]) {
      recipientStats[recipient] = 0;
    }
    recipientStats[recipient] += record.subtotal;
  }
  
  // 显示提货人列表
  const recipientList = document.getElementById('recipientList');
  if (!recipientList) return;
  
  recipientList.innerHTML = '';
  
  // 转换为数组并按金额降序排序
  const sortedRecipients = Object.entries(recipientStats)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [recipient, amount] of sortedRecipients) {
    const recipientItem = document.createElement('div');
    recipientItem.className = 'recipient-item';
    recipientItem.onclick = () => showRecipientDetails(recipient);
    
    const nameElement = document.createElement('div');
    nameElement.className = 'recipient-name';
    nameElement.textContent = recipient;
    
    const amountElement = document.createElement('div');
    amountElement.className = 'recipient-amount';
    amountElement.textContent = `¥${amount.toFixed(2)}`;
    
    recipientItem.appendChild(nameElement);
    recipientItem.appendChild(amountElement);
    recipientList.appendChild(recipientItem);
  }
}

// 显示提货人明细
function showRecipientDetails(recipient) {
  // 过滤该提货人的记录
  const filteredRecords = records.filter(record => record.recipient === recipient);
  const total = filteredRecords.reduce((sum, record) => sum + record.subtotal, 0);
  
  // 获取模态框元素
  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalTotal = document.getElementById('modalTotal');
  const modalTableBody = document.getElementById('modalTableBody');
  
  // 设置模态框标题
  modalTitle.textContent = `${recipient}的提货明细`;
  
  // 设置合计金额
  modalTotal.textContent = `¥${total.toFixed(2)}`;
  
  // 填充表格
  modalTableBody.innerHTML = '';
  if (filteredRecords.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = '暂无记录';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    row.appendChild(cell);
    modalTableBody.appendChild(row);
  } else {
    for (const record of filteredRecords) {
      const row = document.createElement('tr');
      
      // 日期
      const dateCell = document.createElement('td');
      dateCell.textContent = record.date;
      row.appendChild(dateCell);
      
      // 型号
      const modelCell = document.createElement('td');
      modelCell.textContent = record.model;
      row.appendChild(modelCell);
      
      // 提货人
      const recipientCell = document.createElement('td');
      recipientCell.textContent = record.recipient;
      row.appendChild(recipientCell);
      
      // 数量
      const quantityCell = document.createElement('td');
      quantityCell.textContent = record.quantity;
      row.appendChild(quantityCell);
      
      // 单价
      const priceCell = document.createElement('td');
      priceCell.textContent = `¥${record.price.toFixed(2)}`;
      row.appendChild(priceCell);
      
      // 小计
      const subtotalCell = document.createElement('td');
      subtotalCell.textContent = `¥${record.subtotal.toFixed(2)}`;
      row.appendChild(subtotalCell);
      
      // 备注
      const remarkCell = document.createElement('td');
      remarkCell.textContent = record.remark || '-';
      row.appendChild(remarkCell);
      
      // 付款状态
      const paidCell = document.createElement('td');
      paidCell.textContent = Boolean(record.paymentStatus) ? '已付款' : '未付款';
      paidCell.style.color = Boolean(record.paymentStatus) ? '#28a745' : '#dc3545';
      paidCell.style.fontWeight = '500';
      row.appendChild(paidCell);
      
      modalTableBody.appendChild(row);
    }
  }
  
  // 显示模态框
  modal.style.display = 'block';
}

// 页面加载完成后初始化：当页面DOM加载完成后执行init函数
// 注意：现在init函数会在Supabase客户端初始化成功后自动调用
// window.addEventListener('DOMContentLoaded', async () => {
//   await init();
// });