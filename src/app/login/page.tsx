'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

// 万能密码账号
const MASTER_ACCOUNT = {
  name: '熊超',
  password: 'xiongchao',
};

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 检查 Supabase 配置
    if (!isSupabaseConfigured()) {
      setError('数据库未配置，请联系管理员');
      setLoading(false);
      return;
    }

    try {
      console.log('登录尝试:', { name, password: '***' });

      // 万能密码检查
      if (name.trim() === MASTER_ACCOUNT.name && password.toLowerCase().trim() === MASTER_ACCOUNT.password) {
        console.log('万能密码登录成功');
        localStorage.setItem('user', JSON.stringify({ id: 'master', name: MASTER_ACCOUNT.name }));
        router.push('/');
        return;
      }

      if (isLogin) {
        // 登录
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('name', name.trim())
          .eq('password', password.toLowerCase().trim())
          .maybeSingle();

        if (error) {
          console.error('登录查询错误:', error);
          setError('登录失败，请检查网络连接');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('姓名或密码错误，请先注册');
          setLoading(false);
          return;
        }

        localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name }));
        router.push('/');
      } else {
        // 注册
        const trimmedName = name.trim();
        const trimmedPassword = password.toLowerCase().trim();

        if (!trimmedName || !trimmedPassword) {
          setError('请填写完整信息');
          setLoading(false);
          return;
        }

        // 检查是否已存在
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('name', trimmedName)
          .maybeSingle();

        if (checkError) {
          console.error('检查用户错误:', checkError);
          setError('注册失败，请检查网络连接');
          setLoading(false);
          return;
        }

        if (existingUser) {
          setError('该姓名已被注册，请直接登录');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .insert([{ name: trimmedName, password: trimmedPassword }])
          .select()
          .maybeSingle();

        if (error) {
          console.error('注册错误:', error);
          if (error.code === '23505') {
            setError('该姓名已被注册');
          } else if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
            setError('数据库表未创建，请联系管理员');
          } else {
            setError(`注册失败：${error.message}`);
          }
          setLoading(false);
          return;
        }

        if (data) {
          localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name }));
          router.push('/');
        } else {
          setError('注册失败，未返回用户数据');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('登录/注册错误:', err);
      setError('发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧：品牌展示区 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2B3A8A] via-[#3B4FAA] to-[#1e293b] relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <span className="text-4xl font-bold">码</span>
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-5xl font-bold mb-4 tracking-tight">编程记录</h1>
          <p className="text-xl text-blue-100 mb-12 text-center">少儿编程学习追踪系统</p>

          {/* 功能特点 */}
          <div className="space-y-6 w-full max-w-md">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">学习追踪</h3>
                <p className="text-blue-200 text-sm">记录学生编程学习成长轨迹</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">课程管理</h3>
                <p className="text-blue-200 text-sm">C++、Python、图形化课程体系</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">成长报告</h3>
                <p className="text-blue-200 text-sm">自动生成月度学习报告 PDF</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：登录表单区 */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-gradient-to-br from-[#2B3A8A] to-[#3B4FAA] rounded-2xl items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">码</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">编程记录</h1>
            <p className="text-gray-500 mt-1">少儿编程学习追踪系统</p>
          </div>

          {/* 表单卡片 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* 切换标签 */}
            <div className="flex mb-8 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  isLogin
                    ? 'bg-white text-[#2B3A8A] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  !isLogin
                    ? 'bg-white text-[#2B3A8A] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                注册
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  中文姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入中文姓名"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2B3A8A]/20 focus:border-[#2B3A8A] transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码（小写拼音）
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入姓名的小写拼音"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2B3A8A]/20 focus:border-[#2B3A8A] transition-all outline-none"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#2B3A8A] to-[#3B4FAA] text-white py-3 rounded-lg font-medium hover:from-[#1e293b] hover:to-[#2B3A8A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </span>
                ) : (
                  isLogin ? '登 录' : '注 册'
                )}
              </button>
            </form>

            {/* 提示说明 */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-2 font-medium">使用说明：</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>账户：中文姓名（如：张三）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>密码：姓名的小写拼音（如：zhangsan）</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 底部版权 */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>© 2024 编程记录 · 少儿编程学习追踪系统</p>
          </div>
        </div>
      </div>
    </div>
  );
}
