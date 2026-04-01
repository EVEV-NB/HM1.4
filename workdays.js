// Supabase配置
const SUPABASE_URL = 'https://agvezeuegoqzjcclqgfe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndmV6ZXVlZ29xempjY2xxZ2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjUzNTMsImV4cCI6MjA5MDUwMTM1M30.3SQsJrDaoH86WsHAPLFVyTWLnKg298lRuGAgReMvPzg';

// 初始化Supabase客户端
let supabaseClient;
let currentUser = null;

// 全局变量
let currentDate = new Date();
let workers = [];
let workdays = [];

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 初始化Supabase客户端
    if (window.supabase) {
      // 使用匿名密钥初始化
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase客户端初始化成功（使用匿名密钥）');
      
      // 检查登录状态
      await checkAuthStatus();
    } else {
      console.error('Supabase库未加载');
      alert('Supabase库未加载，请检查网络连接');
    }
  } catch (error) {
    console.error('初始化失败:', error);
    alert('初始化失败: ' + error.message);
  }
});

// 检查认证状态
async function checkAuthStatus() {
  try {
    // 由于使用服务密钥，我们可以简化认证检查
    // 尝试获取用户信息，但即使失败也继续执行
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        currentUser = user;
        updateUserUI(user);
      }
    } catch (authError) {
      console.log('认证检查失败，但继续执行（使用服务密钥）:', authError);
    }
    
    // 无论认证状态如何，都加载工人和工天记录
    await loadWorkers();
    await loadWorkdays();
    renderWorkers();
  } catch (error) {
    console.error('检查认证状态失败:', error);
    alert('检查认证状态失败: ' + error.message);
    // 不重定向，让用户查看错误信息
  }
}

// 更新用户UI
function updateUserUI(user) {
  const userInfo = document.getElementById('userInfo');
  const userEmail = document.getElementById('userEmail');
  
  if (userInfo && userEmail) {
    userInfo.style.display = 'flex';
    userEmail.textContent = user.email;
  }
}

// 退出登录
async function logout() {
  try {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('退出登录失败:', error);
    alert('退出登录失败: ' + error.message);
  }
}

// 加载工人列表
async function loadWorkers() {
  try {
    const { data, error } = await supabaseClient
      .from('workers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('加载工人失败:', error);
      alert('加载工人失败: ' + error.message);
      return;
    }
    
    workers = data;
  } catch (error) {
    console.error('加载工人失败:', error);
    alert('加载工人失败: ' + error.message);
  }
}

// 加载工天记录
async function loadWorkdays() {
  try {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    const { data, error } = await supabaseClient
      .from('workdays')
      .select('*')
      .eq('year', year)
      .eq('month', month);
    
    if (error) {
      console.error('加载工天记录失败:', error);
      alert('加载工天记录失败: ' + error.message);
      return;
    }
    
    workdays = data;
  } catch (error) {
    console.error('加载工天记录失败:', error);
    alert('加载工天记录失败: ' + error.message);
  }
}

// 渲染工人列表
function renderWorkers() {
  const workerList = document.getElementById('workerList');
  if (!workerList) return;
  
  workerList.innerHTML = '';
  
  workers.forEach(worker => {
    const workerCard = createWorkerCard(worker);
    workerList.appendChild(workerCard);
  });
}

// 创建工人卡片
function createWorkerCard(worker) {
  const card = document.createElement('div');
  card.className = 'worker-card';
  
  // 计算当月工天
  const totalWorkdays = calculateTotalWorkdays(worker.id);
  
  card.innerHTML = `
    <div class="worker-header">
      <div class="worker-name">${worker.name}</div>
      <div class="workday-total">本月工天: ${totalWorkdays}</div>
    </div>
    <div class="workday-calendar" id="calendar-${worker.id}">
      ${generateCalendar(worker.id)}
    </div>
  `;
  
  return card;
}

// 生成日历
function generateCalendar(workerId) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 获取当月第一天是星期几
  const firstDay = new Date(year, month, 1).getDay();
  // 获取当月的天数
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let calendarHTML = `
    <div class="weekday-header">日</div>
    <div class="weekday-header">一</div>
    <div class="weekday-header">二</div>
    <div class="weekday-header">三</div>
    <div class="weekday-header">四</div>
    <div class="weekday-header">五</div>
    <div class="weekday-header">六</div>
  `;
  
  // 添加上月剩余天数的空单元格
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<div class="day-cell empty"></div>';
  }
  
  // 添加当月天数
    for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const workday = workdays.find(w => w.worker_id === workerId && w.date === dateStr);
    
    let className = 'day-cell';
    
    if (workday) {
        if (workday.type === 'full') {
        className += ' workday';
        } else if (workday.type === 'half') {
        className += ' half-day';
        }
    }
    
    calendarHTML += `
        <div class="${className}" onclick="showDayMenu(this, ${workerId}, ${year}, ${month + 1}, ${day})">
        ${day}
        </div>
    `;
    }
  
  return calendarHTML;
}

// 显示日期菜单
function showDayMenu(element, workerId, year, month, day) {
  // 移除之前的菜单
  const existingMenu = document.querySelector('.day-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // 阻止事件冒泡，避免触发其他点击事件
  event.stopPropagation();
  
  // 获取点击位置
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top;
  
  // 创建新菜单
  const menu = document.createElement('div');
  menu.className = 'day-menu';
  
  // 设置菜单位置
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const workday = workdays.find(w => w.worker_id === workerId && w.date === dateStr);
  
  menu.innerHTML = `
    <button onclick="setWorkdayType(${workerId}, '${dateStr}', 'full'); closeDayMenu();">全天</button>
    <button onclick="setWorkdayType(${workerId}, '${dateStr}', 'half'); closeDayMenu();">半天</button>
    <button onclick="setWorkdayType(${workerId}, '${dateStr}', 'none'); closeDayMenu();">无</button>
  `;
  
  // 添加到body而不是element，避免位置问题
  document.body.appendChild(menu);
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', closeDayMenu, { once: true });
}

// 关闭日期菜单
function closeDayMenu() {
  const menu = document.querySelector('.day-menu');
  if (menu) {
    menu.remove();
  }
}

// 设置工天类型
async function setWorkdayType(workerId, date, type) {
  try {
    const year = parseInt(date.split('-')[0]);
    const month = parseInt(date.split('-')[1]);
    
    if (type === 'none') {
      // 删除记录
      const { error } = await supabaseClient
        .from('workdays')
        .delete()
        .eq('worker_id', workerId)
        .eq('date', date);
      
      if (error) {
        console.error('删除工天记录失败:', error);
        alert('删除工天记录失败: ' + error.message);
        return;
      }
    } else {
      // 检查是否已存在记录
      const existingWorkday = workdays.find(w => w.worker_id === workerId && w.date === date);
      
      if (existingWorkday) {
        // 更新记录
        const { error } = await supabaseClient
          .from('workdays')
          .update({ type: type })
          .eq('id', existingWorkday.id);
        
        if (error) {
          console.error('更新工天记录失败:', error);
          alert('更新工天记录失败: ' + error.message);
          return;
        }
      } else {
        // 创建新记录
        const { error } = await supabaseClient
          .from('workdays')
          .insert({
            worker_id: workerId,
            date: date,
            type: type,
            year: year,
            month: month
          });
        
        if (error) {
          console.error('创建工天记录失败:', error);
          alert('创建工天记录失败: ' + error.message);
          return;
        }
      }
    }
    
    // 重新加载工天记录
    await loadWorkdays();
    renderWorkers();
  } catch (error) {
    console.error('设置工天类型失败:', error);
    alert('设置工天类型失败: ' + error.message);
  }
}

// 计算总工天
function calculateTotalWorkdays(workerId) {
  let total = 0;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 月份从0开始，所以加1
  
  workdays.forEach(workday => {
    if (workday.worker_id === workerId && workday.year === currentYear && workday.month === currentMonth) {
      if (workday.type === 'full') {
        total += 1;
      } else if (workday.type === 'half') {
        total += 0.5;
      }
    }
  });
  
  return total.toFixed(1);
}

// 切换月份
function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  updateCurrentMonth();
  loadWorkdays();
  renderWorkers();
}

// 更新当前月份显示
function updateCurrentMonth() {
  const currentMonthEl = document.getElementById('currentMonth');
  if (currentMonthEl) {
    currentMonthEl.textContent = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
  }
}

// 显示工人管理模态框
function showWorkerManagement() {
  const modal = document.getElementById('workerManagementModal');
  if (modal) {
    // 显示模态框
    modal.style.display = 'flex';
    // 加载现有工人列表
    loadWorkerListInModal();
  }
}

// 关闭工人管理模态框
function closeWorkerManagement() {
  const modal = document.getElementById('workerManagementModal');
  if (modal) {
    modal.style.display = 'none';
    // 清空表单
    document.getElementById('workerName').value = '';
    document.getElementById('workerId').value = '';
  }
}

// 加载模态框中的工人列表
function loadWorkerListInModal() {
  const workerListInModal = document.getElementById('workerListInModal');
  if (!workerListInModal) return;
  
  workerListInModal.innerHTML = '';
  
  if (workers.length === 0) {
    workerListInModal.innerHTML = '<p style="text-align: center; color: #666;">暂无工人</p>';
    return;
  }
  
  workers.forEach(worker => {
    const workerItem = document.createElement('div');
    workerItem.style.display = 'flex';
    workerItem.style.justifyContent = 'space-between';
    workerItem.style.alignItems = 'center';
    workerItem.style.padding = '10px';
    workerItem.style.borderBottom = '1px solid #e0e0e0';
    
    workerItem.innerHTML = `
      <span>${worker.name} (ID: ${worker.id})</span>
      <button onclick="deleteWorker('${worker.id}')" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        删除
      </button>
    `;
    
    workerListInModal.appendChild(workerItem);
  });
}

// 保存工人
async function saveWorker() {
  const name = document.getElementById('workerName').value.trim();
  const workerId = document.getElementById('workerId').value.trim();
  
  console.log('Name:', name, 'Length:', name.length);
  console.log('WorkerId:', workerId, 'Length:', workerId.length);
  
  if (name === '' || workerId === '') {
    alert('请填写工人姓名和ID');
    return;
  }
  
  try {
    // 尝试添加工人
    const { data, error } = await supabaseClient
      .from('workers')
      .insert({
        id: workerId,
        name: name
      })
      .select();
    
    if (error) {
      console.error('添加工人失败:', error);
      
      // 检查是否是行级安全策略问题
      if (error.message.includes('row-level security policy')) {
        alert('添加工人失败: 权限不足，请检查Supabase的行级安全策略设置');
        console.log('请在Supabase控制台为workers表设置适当的RLS策略');
      } else {
        alert('添加工人失败: ' + error.message);
      }
      return;
    }
    
    // 重新加载工人列表
    await loadWorkers();
    renderWorkers();
    // 关闭模态框
    closeWorkerManagement();
    alert('工人添加成功');
  } catch (error) {
    console.error('添加工人失败:', error);
    alert('添加工人失败: ' + error.message);
  }
}

// 删除工人
async function deleteWorker(workerId) {
  if (!confirm('确定要删除这个工人吗？相关的工天记录也会被删除。')) {
    return;
  }
  
  try {
    // 先删除相关的工天记录
    const { error: deleteWorkdaysError } = await supabaseClient
      .from('workdays')
      .delete()
      .eq('worker_id', workerId);
    
    if (deleteWorkdaysError) {
      console.error('删除工天记录失败:', deleteWorkdaysError);
      alert('删除工天记录失败: ' + deleteWorkdaysError.message);
      return;
    }
    
    // 再删除工人
    const { error: deleteWorkerError } = await supabaseClient
      .from('workers')
      .delete()
      .eq('id', workerId);
    
    if (deleteWorkerError) {
      console.error('删除工人失败:', deleteWorkerError);
      alert('删除工人失败: ' + deleteWorkerError.message);
      return;
    }
    
    // 重新加载工人列表
    await loadWorkers();
    await loadWorkdays();
    renderWorkers();
    // 更新模态框中的工人列表
    loadWorkerListInModal();
    alert('工人删除成功');
  } catch (error) {
    console.error('删除工人失败:', error);
    alert('删除工人失败: ' + error.message);
  }
}
