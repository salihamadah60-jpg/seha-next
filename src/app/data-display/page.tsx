'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './page.module.css';

// تعريف أنواع البيانات المتوقعة من الـ API
interface LeaveData {
  _id: string;
  name: { arabic: string };
  issueDate: string;
  startDate: { gregorian: string };
  endDate: { gregorian: string };
  leaveDuration: number;
  doctorName: { arabic: string };
  jobTitle: { arabic: string };
}

export default function DataDisplay() {
  // تحديد نوع الحالة باستخدام الواجهة التي تم تعريفها
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [servicecode, setServicecode] = useState('');
  const router = useRouter();

  useEffect(() => {
    setIdNumber(localStorage.getItem('idNumber') || '');
    setServicecode(localStorage.getItem('servicecode') || '');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!idNumber || !servicecode) {
        // لا تقم بتعيين خطأ إذا كانت البيانات لا تزال قيد التحميل من localStorage
        // فقط انتظر حتى يتم جلبها
        return;
      }
      try {
        // استخدام المسار النسبي للـ API داخل Next.js
        const apiUrl = `/api/user-leaves?idNumber=${idNumber}&servicecode=${servicecode}`;
        const response = await axios.get<LeaveData[]>(apiUrl);
        setLeaves(response.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          setError(error.response.data.message || 'فشل في جلب البيانات. تأكد من صحة البيانات.');
        } else {
          setError('حدث خطأ غير متوقع أثناء جلب البيانات.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (idNumber && servicecode) fetchData();
  }, [idNumber, servicecode]);

  if (loading) {
    return <div className={styles.message}>جارِ التحميل...</div>;
  }

  if (error) {
    return <div className={styles.message}>{error}</div>;
  }

  // تحديد نوع المتغير `date`
  const formatDate = (date: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(date).toLocaleDateString('en-GB', options).split('/').reverse().join('-');
  };

  return (
    <main className={styles.main}>

        <div>
          <h1 className={styles.h1}><span className={styles.highlight}>الإجازات المرضية</span></h1>
          <p className={styles.subtitle}>
            خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
          </p>
  
          <div className={styles.inputContainer}>
            <input
              type="text"
              id="servicecode"
              className={styles.inputField}
              placeholder="كلمة المرور"
              value={servicecode}
              readOnly
            />
            <input
              type="text"
              id="idNumber"
              className={styles.inputField}
              placeholder="رقم الهوية / الإقامة"
              value={idNumber}
              readOnly
            />
          </div>
        </div>
        <div className={styles.dataContainer} id="dataContainer">
          {leaves.length === 0 ? (
            <div className={styles.message}>لا توجد بيانات إجازة للمستخدم.</div>
          ) : (
            // تحديد نوع المتغير `data`
            leaves.map((data: LeaveData) => (
              <div key={data._id} className={styles.dataItem}>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>الاسم:</span>
                  <span>{data.name.arabic}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>تاريخ إصدار تقرير الإجازة:</span>
                  <span>{formatDate(data.issueDate)}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>تبدأ من:</span>
                  <span>{formatDate(data.startDate.gregorian)}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>وحتى:</span>
                  <span>{formatDate(data.endDate.gregorian)}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>المدة بالايام:</span>
                  <span>{data.leaveDuration}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>اسم الطبيب:</span>
                  <span>{data.doctorName.arabic}</span>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.dataLabel}>المسمى الوظيفي:</span>
                  <span>{data.jobTitle.arabic}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className={styles.buttonContainer}>
          <button className={styles.button} onClick={() => router.back()}>استعلام جديد</button>
          <a href="https://www.seha.sa/ui#/inquiries" className={styles.button} target="_blank" rel="noopener noreferrer">الرجوع للاستعلامات</a>
        </div>
    </main>
  );
}
