'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import axios from 'axios';
import styles from './page.module.css';

const Login = () => {
  const [idNumber, setIdNumber] = useState('');
  const [servicecode, setServiceCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/admin-dashboard');
    router.prefetch('/data-display');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    if (!idNumber || !servicecode) {
      setErrorMessage('فضلاً أدخل رقم الهوية وكلمة المرور');
      setLoading(false);
      return;
    }

    try {
      // استخدام المسار النسبي للـ API داخل Next.js
      const apiUrl = `/api/auth/login`;
      const response = await axios.post(apiUrl, { idNumber, servicecode });
      const { token, role } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('idNumber', idNumber);
      localStorage.setItem('servicecode', servicecode);
      if (role === 'admin') {
        router.push('/admin-dashboard');
      } else {
        router.push('/data-display');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // خطأ من الخادم (مثل: بيانات اعتماد غير صحيحة)
        setErrorMessage(error.response.data.message || 'فشل تسجيل الدخول رمز الخدمة او رقم الهوية خطأ');
      } else if (error instanceof Error) {
        // أخطاء أخرى (مثل: مشاكل في الشبكة)
        setErrorMessage(error.message);
      } else {
        setErrorMessage('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.h1}><span className={styles.highlight}>الإجازات المرضية</span></h1>
      <h2 className={styles.h2}>خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي</h2>
      <div className={styles.loginContainer}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.inputGroup1}>
            <input
              className={styles.input}
              type="text"
              id="idNumber"
              placeholder="رقم الهوية / الإقامة"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className={styles.inputGroup2}>
            <input
              className={styles.input}
              type="password"
              id="servicecode"
              placeholder="رمز الخدمة"
              value={servicecode}
              onChange={(e) => setServiceCode(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'استعلام'}
          </button>
          <button type="button" className={styles.button} onClick={() => window.location.reload()}>
            استعلام جديد
          </button>
          <div
            className={styles.passwordRecovery}
            onClick={() => {
              setIdNumber('');
              setServiceCode('');
              setErrorMessage('');
            }}
            style={{ cursor: 'pointer', color: '#366fb5', marginTop: '10px'}}
          >
            إستعادة كلمة المرور
          </div>
        </form>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(Login), {
  ssr: false,
});
