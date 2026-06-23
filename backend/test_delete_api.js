async function run() {
  try {
    // 1. Login as admin
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin1234' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.accessToken;
    console.log('Logged in, token received');

    // 2. Fetch departments
    const deptsRes = await fetch('http://localhost:5000/api/departments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const deptsData = await deptsRes.json();
    const deptId = deptsData[0].id;
    console.log('Using Department ID:', deptId);

    // 3. Fetch cost centers
    const ccRes = await fetch(`http://localhost:5000/api/cost-centers?department_id=${deptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ccData = await ccRes.json();
    const ccId = ccData[0]?.id || null;
    console.log('Using Cost Center ID:', ccId);

    // 4. Create a new entry
    const createRes = await fetch('http://localhost:5000/api/expenses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        month: 4,
        year: 2026,
        department_id: deptId,
        cost_center_id: ccId,
        account_code: '53010060',
        item_name: 'Test Temporary Row',
        amount: 1500,
        reason_note: 'For testing deletion',
        is_budget_cut: false,
        entry_type: 'รายจ่าย'
      })
    });
    const newEntry = await createRes.json();
    console.log('Created temporary entry ID:', newEntry.id);

    // 5. Try to delete the entry
    console.log('Sending DELETE request...');
    const deleteRes = await fetch(`http://localhost:5000/api/expenses/${newEntry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    console.log('DELETE response status:', deleteRes.status);
    console.log('DELETE response body:', deleteData);

  } catch (err) {
    console.error('API Test Error:', err.message);
  }
}

run();
