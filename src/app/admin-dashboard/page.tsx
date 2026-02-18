'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import moment from 'moment-hijri';
import 'moment/locale/en-gb';
import 'moment/locale/ar';
import styles from './page.module.css';
import Image from 'next/image';

// Types for leaves and related nested fields
type PersonName = { arabic: string; english: string };
type HospitalName = { arabic: string; english: string };
export type Leave = {
  _id: string;
  idNumber: string;
  servicecode: string;
  leaveDuration: number | string;
  startDate: string;
  endDate: string;
  issueDate: string;
  startDateHijri?: string;
  endDateHijri?: string;
  name: PersonName;
  nationality: PersonName;
  workPlace: string;
  doctorName: PersonName;
  jobTitle: PersonName;
  hospital: HospitalName;
  phoneNumber: string;
};

// Strongly typed form state to avoid `any` casts
type FormDataState = {
  idNumber: string;
  servicecode: string;
  leaveDuration: string | number;
  startDate: string;
  endDate: string;
  issueDate: string;
  startDateHijri: string;
  endDateHijri: string;
  name: PersonName;
  nationality: PersonName;
  workPlace: string;
  doctorName: PersonName;
  jobTitle: PersonName;
  hospital: HospitalName;
  phoneNumber: string;
};

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

moment.locale('en-gb');

const convertToHijri = (gregorianDate: string): string => {
  try {
    if (!gregorianDate) return '';
    const date = moment(gregorianDate, 'YYYY-MM-DD');
    return date.format('iYYYY-iMM-iDD');
  } catch (error) {
    console.error('Error converting to Hijri date:', error);
    return '';
  }
};

export default function AdminDashboard() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage] = useState('');
  const [formData, setFormData] = useState<FormDataState>({
    idNumber: '',
    servicecode: '',
    leaveDuration: '',
    startDate: '',
    endDate: '',
    issueDate: '',
    startDateHijri: '',
    endDateHijri: '',
    name: {
      arabic: '',
      english: ''
    },
    nationality: {
      arabic: '',
      english: ''
    },
    workPlace: '',
    doctorName: {
      arabic: '',
      english: ''
    },
    jobTitle: {
      arabic: '',
      english: ''
    },
    hospital: {
      arabic: '',
      english: ''
    },
    phoneNumber: '',
  });

  const [newServiceCode, setNewServiceCode] = useState('');
  const [successServiceCode, setSuccessServiceCode] = useState('');
  const [adminFormData, setAdminFormData] = useState({
    idNumber: '',
    password: ''
  });
  const [fetchIdNumber, setFetchIdNumber] = useState('');
  const [editingLeave, setEditingLeave] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<Partial<Leave>>({});
  const [sendSMS, setSendSMS] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');

  // Hospital autocomplete state
  const [allHospitals, setAllHospitals] = useState<Array<{ arabic: string; english: string; path: string }>>([]);
  const [hospitalSuggestions, setHospitalSuggestions] = useState<Array<{ arabic: string; english: string; path: string }>>([]);
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [activeHospitalField, setActiveHospitalField] = useState<string | null>(null);
  const [selectedHospitalImage, setSelectedHospitalImage] = useState<string | null>(null);
  const [newHospitalFile, setNewHospitalFile] = useState<File | null>(null);

  const router = useRouter();
  const token = getToken();

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    const isAdmin = token && JSON.parse(atob(token.split('.')[1]))?.isAdmin;
    if (!isAdmin) {
      alert('لا تملك صلاحيات الوصول إلى هذه الصفحة.');
      router.push('/');
      return;
    }
    setLoading(false);
  }, [token, router]);

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewHospitalFile(e.target.files[0]);
      setSelectedHospitalImage(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "startDate" || name === "endDate") {
      const date = moment(value, 'YYYY-MM-DD').locale('en-gb').format('YYYY-MM-DD');
      const hijriDate = convertToHijri(date);
      if (name === 'startDate') {
        setFormData(prev => ({ ...prev, startDate: date, startDateHijri: hijriDate }));
      } else {
        setFormData(prev => ({ ...prev, endDate: date, endDateHijri: hijriDate }));
      }
    } else if (name.includes('.')) {
      const [parentKey, childKey] = name.split('.');
      // Track when typing into hospital fields to trigger suggestions
      if (parentKey === 'hospital') {
        setActiveHospitalField(name);
        setHospitalQuery(value);
      }
      setFormData(prev => {
        const key = childKey as 'arabic' | 'english';
        switch (parentKey) {
          case 'name':
            return { ...prev, name: { ...prev.name, [key]: value } };
          case 'nationality':
            return { ...prev, nationality: { ...prev.nationality, [key]: value } };
          case 'doctorName':
            return { ...prev, doctorName: { ...prev.doctorName, [key]: value } };
          case 'jobTitle':
            return { ...prev, jobTitle: { ...prev.jobTitle, [key]: value } };
          case 'hospital':
            return { ...prev, hospital: { ...prev.hospital, [key]: value } };
          default:
            return prev;
        }
      });
    } else {
      setFormData(prev => ({ ...prev, [name as keyof typeof prev]: value } as typeof prev));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parentKey, childKey] = name.split('.');
      const key = childKey as 'arabic' | 'english';
      setEditingValue(prev => {
        const current = (prev ?? {}) as Partial<Leave>;
        switch (parentKey) {
          case 'name':
            return { ...current, name: { ...(current.name ?? { arabic: '', english: '' }), [key]: value } };
          case 'nationality':
            return { ...current, nationality: { ...(current.nationality ?? { arabic: '', english: '' }), [key]: value } };
          case 'doctorName':
            return { ...current, doctorName: { ...(current.doctorName ?? { arabic: '', english: '' }), [key]: value } };
          case 'jobTitle':
            return { ...current, jobTitle: { ...(current.jobTitle ?? { arabic: '', english: '' }), [key]: value } };
          case 'hospital':
            return { ...current, hospital: { ...(current.hospital ?? { arabic: '', english: '' }), [key]: value } };
          default:
            return current;
        }
      });
    } else {
      setEditingValue(prev => ({ ...(prev ?? {}), [name as keyof Leave]: value } as Partial<Leave>));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const start = new Date(formData.startDate as string).getTime();
    const end = new Date(formData.endDate as string).getTime();
    const leaveDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (Number.isNaN(leaveDuration)) {
      alert("حساب مدة الإجازة غير صحيح، تأكد من إدخال التواريخ بشكل صحيح.");
      return;
    }

    const updatedFormData: (FormDataState & { leaveDuration: number; sendSMS: boolean; selectedHospitalImage?: string }) = {
      ...formData,
      leaveDuration,
      sendSMS,
    };

    let finalHospitalImage = selectedHospitalImage;

    // If a new hospital file is selected, upload it first
    if (newHospitalFile) {
      try {
        const hospitalUploadData = new FormData();
        hospitalUploadData.append('file', newHospitalFile);
        hospitalUploadData.append('arabicName', formData.hospital.arabic);
        hospitalUploadData.append('englishName', formData.hospital.english);

        const uploadRes = await axios.post('/api/hospitals/upload', hospitalUploadData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (uploadRes.status === 200) {
          finalHospitalImage = uploadRes.data.path;
        }
      } catch (err) {
        console.error('Error uploading new hospital:', err);
        alert('فشل في رفع شعار المستشفى الجديد.');
        return;
      }
    }

    if (finalHospitalImage) {
      updatedFormData.selectedHospitalImage = finalHospitalImage;
    }

    try {
      const response = await axios.post('/api/add-leave-and-generate-pdf', {
        ...updatedFormData
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('download', `${updatedFormData.servicecode}_new.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setDownloadLink(url);
        setNewServiceCode(updatedFormData.servicecode);
        setSuccessServiceCode(updatedFormData.servicecode);
        resetForm();
        alert(`تم رفع الإجازة وإنشاء الـ PDF بنجاح! رمز الخدمة: ${updatedFormData.servicecode}`);
      } else {
        alert('حدث خطأ أثناء إنشاء ملف الـ PDF.');
      }
    } catch (error: any) {
      console.error('Error occurred while creating PDF link:', error);
      
      let message = 'حدث خطأ أثناء إضافة الإجازة.';
      
      // If response is a Blob (due to responseType: 'blob'), we need to parse it as JSON to see the error message
      if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
        try {
          const text = await error.response.data.text();
          const jsonData = JSON.parse(text);
          message = jsonData.message || message;
          if (jsonData.error) message += `\n\nالتفاصيل: ${jsonData.error}`;
        } catch (parseErr) {
          console.error('Error parsing blob error message:', parseErr);
        }
      } else {
        message = error.response?.data?.message || message;
        if (error.response?.data?.error) message += `\n\nالتفاصيل: ${error.response.data.error}`;
      }
      
      alert(message);
    }
  };

  const handleDownload = async () => {
    if (downloadLink) {
      try {
        const response = await axios.get(downloadLink, {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${newServiceCode}_new.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        alert('حدث خطأ أثناء تحميل الملف.');
        console.error('Error:', error);
      }
    } else {
      alert('لا يوجد رابط تحميل متاح.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/add-admin', adminFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      alert("تم إضافة المشرف الجديد بنجاح!");
      resetAdminForm();
    } catch (error) {
      console.error('Error adding admin:', error);
      alert("فشل في إضافة المشرف الجديد");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/leaves/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setLeaves((prevLeaves) => prevLeaves.filter((leave) => leave._id !== id));
    } catch (error) {
      console.error('فشل في حذف الإجازة', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await axios.put(`/api/leaves/${id}`, editingValue, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setLeaves((prevLeaves) =>
        prevLeaves.map((leave) => (leave._id === id ? { ...leave, ...(editingValue as Partial<Leave>) } : leave))
      );
      setEditingLeave(null);
      alert("تم تحديث الإجازة بنجاح!");
    } catch (error) {
      console.error('فشل في تحديث الإجازة', error);
    }
  };

  const startEditing = (leave: Leave) => {
    setEditingLeave(leave._id);
    setEditingValue(leave);
  };

  const cancelEditing = () => {
    setEditingLeave(null);
    setEditingValue({});
  };

  useEffect(() => {
    const loadLeaves = async () => {
      try {
        if (fetchIdNumber && formData.servicecode) {
          const response = await axios.get(`/api/user-leaves?idNumber=${fetchIdNumber}&servicecode=${formData.servicecode}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          setLeaves(response.data as Leave[]);
        }
      } catch (error) {
        console.error('Error fetching leaves:', error);
      }
    };

    loadLeaves();
  }, [fetchIdNumber, formData.servicecode, token]);

  // Fetch all hospitals only when needed
  useEffect(() => {
    if (newServiceCode === 'addLeave' && allHospitals.length === 0) {
      const fetchAllHospitals = async () => {
        try {
          const res = await axios.get('/api/hospitals', { headers: { 'Cache-Control': 'no-cache' } });
          setAllHospitals(res.data || []);
        } catch (err) {
          console.error('Error fetching hospitals:', err);
        }
      };
      fetchAllHospitals();
    }
  }, [newServiceCode, allHospitals.length]);

  // Filter hospitals locally for instant results
  useEffect(() => {
    const q = hospitalQuery?.trim().toLowerCase();
    if (!q) {
      setHospitalSuggestions(allHospitals.slice(0, 20));
      return;
    }

    const filtered = allHospitals.filter(h => 
      h.arabic.toLowerCase().includes(q) || 
      h.english.toLowerCase().includes(q)
    ).slice(0, 20);

    setHospitalSuggestions(filtered);
  }, [hospitalQuery, allHospitals]);

  const loadLeavesCallback = useCallback(async () => {
    try {
      if (fetchIdNumber && formData.servicecode) {
        const response = await axios.get(`/api/user-leaves?idNumber=${fetchIdNumber}&servicecode=${formData.servicecode}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setLeaves(response.data as Leave[]);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  }, [fetchIdNumber, formData.servicecode, token]);

  const resetForm = () => {
    setFormData({
      idNumber: '',
      servicecode: '',
      leaveDuration: '',
      startDate: '',
      endDate: '',
      issueDate: '',
      startDateHijri: '',
      endDateHijri: '',
      name: {
        arabic: '',
        english: ''
      },
      nationality: {
        arabic: '',
        english: ''
      },
      workPlace: '',
      doctorName: {
        arabic: '',
        english: ''
      },
      jobTitle: {
        arabic: '',
        english: ''
      },
      hospital: {
        arabic: '',
        english: ''
      },
      phoneNumber: '',
    });
    setSendSMS(false);
    setSelectedHospitalImage(null);
    setNewHospitalFile(null);
  };

  const resetAdminForm = () => {
    setAdminFormData({
      idNumber: '',
      password: ''
    });
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className={styles.adminDashboard}>
      {/* Navigation Buttons */}
      <div className={styles.buttonsContainer}>
        <button onClick={() => setNewServiceCode('addLeave')}>إضافة إجازة</button>
        <button onClick={() => setNewServiceCode('manageLeaves')}>إدارة الإجازات</button>
        <button onClick={() => setNewServiceCode('addAdmin')}>إضافة مُشرِف</button>
      </div>

      {/* Add Leave Form */}
      {newServiceCode === 'addLeave' && (
        <form onSubmit={handleSubmit} className={styles.leaveForm}>
          <div className={styles.formGroup}>
            <input
              type="text"
              id="idNumber"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleInputChange}
              placeholder="رقم الهوية"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="servicecode"
              name="servicecode"
              value={formData.servicecode}
              onChange={handleInputChange}
              placeholder="رمز الخدمة"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="date"
              id="issueDate"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleInputChange}
              placeholder="تاريخ إصدار تقرير الإجازة"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              placeholder="تبدأ من"
              required
            />
            {formData.startDateHijri && <span className={styles.hijriDate}> ({formData.startDateHijri})</span>}
          </div>

          <div className={styles.formGroup}>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              placeholder="وحتى"
              required
            />
            {formData.endDateHijri && <span className={styles.hijriDate}> ({formData.endDateHijri})</span>}
          </div>

          {/* Name Fields */}
          <div className={styles.formGroup}>
            <input
              type="text"
              id="name.arabic"
              name="name.arabic"
              value={formData.name.arabic}
              onChange={handleInputChange}
              placeholder="الاسم (عربي)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="name.english"
              name="name.english"
              value={formData.name.english}
              onChange={handleInputChange}
              placeholder="الاسم (إنجليزي)"
              required
            />
          </div>

          {/* Work Information */}
          <div className={styles.formGroup}>
            <input
              type="text"
              id="workPlace"
              name="workPlace"
              value={formData.workPlace}
              onChange={handleInputChange}
              placeholder="جهة العمل"
              required
            />
          </div>

          {/* Nationality Fields */}
          <div className={styles.formGroup}>
            <input
              type="text"
              id="nationality.arabic"
              name="nationality.arabic"
              value={formData.nationality.arabic}
              onChange={handleInputChange}
              placeholder="الجنسية (عربي)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="nationality.english"
              name="nationality.english"
              value={formData.nationality.english}
              onChange={handleInputChange}
              placeholder="الجنسية (إنجليزي)"
              required
            />
          </div>

          {/* Doctor Information */}
          <div className={styles.formGroup}>
            <input
              type="text"
              id="doctorName.arabic"
              name="doctorName.arabic"
              value={formData.doctorName.arabic}
              onChange={handleInputChange}
              placeholder="اسم الطبيب المعالج (عربي)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="doctorName.english"
              name="doctorName.english"
              value={formData.doctorName.english}
              onChange={handleInputChange}
              placeholder="اسم الطبيب المعالج (إنجليزي)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="jobTitle.arabic"
              name="jobTitle.arabic"
              value={formData.jobTitle.arabic}
              onChange={handleInputChange}
              placeholder="المسمى الوظيفي (عربي)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              id="jobTitle.english"
              name="jobTitle.english"
              value={formData.jobTitle.english}
              onChange={handleInputChange}
              placeholder="المسمى الوظيفي (إنجليزي)"
              required
            />
          </div>

          {/* Hospital Information */}
          <div className={`${styles.formGroup} ${styles.relativeGroup}`}>
            <input
              type="text"
              id="hospital.arabic"
              name="hospital.arabic"
              value={formData.hospital.arabic}
              onChange={handleInputChange}
              onFocus={() => setActiveHospitalField('hospital.arabic')}
              placeholder="اسم المستشفى (عربي)"
              required
            />
            {activeHospitalField === 'hospital.arabic' && (
              <ul className={styles.hospitalDropdown}>
                {hospitalSuggestions.length === 0 ? (
                  <li className={styles.hospitalNoSuggestions}>لا توجد اقتراحات</li>
                ) : (
                  hospitalSuggestions.map((hospital, index) => (
                    <li
                      key={`ar-${index}`}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          hospital: {
                            arabic: hospital.arabic || '',
                            english: hospital.english || ''
                          }
                        }));
                        setSelectedHospitalImage(hospital.path);
                        setHospitalSuggestions([]);
                        setActiveHospitalField(null);
                      }}
                      className={styles.hospitalItem}
                    >
                      <Image
                        src={hospital.path}
                        alt={hospital.arabic || hospital.english || 'hospital'}
                        width={40}
                        height={40}
                        style={{ objectFit: 'contain', flexShrink: 0 }}
                      />
                      <div className={styles.hospitalItemText}>
                        <span className={styles.hospitalNamePrimary}>{hospital.arabic || ''}</span>
                        <span className={styles.hospitalNameSecondary}>{hospital.english || ''}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.relativeGroup}`}>
            <input
              type="text"
              id="hospital.english"
              name="hospital.english"
              value={formData.hospital.english}
              onChange={handleInputChange}
              onFocus={() => setActiveHospitalField('hospital.english')}
              placeholder="اسم المستشفى (إنجليزي)"
              required
            />
            {activeHospitalField === 'hospital.english' && (
              <ul className={styles.hospitalDropdown}>
                {hospitalSuggestions.length === 0 ? (
                  <li className={styles.hospitalNoSuggestions}>No suggestions</li>
                ) : (
                  hospitalSuggestions.map((hospital, index) => (
                    <li
                      key={`en-${index}`}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          hospital: {
                            arabic: hospital.arabic || '',
                            english: hospital.english || ''
                          }
                        }));
                        setSelectedHospitalImage(hospital.path);
                        setHospitalSuggestions([]);
                        setActiveHospitalField(null);
                      }}
                      className={styles.hospitalItem}
                    >
                      <Image
                        src={hospital.path}
                        alt={hospital.arabic || hospital.english || 'hospital'}
                        width={40}
                        height={40}
                        style={{ objectFit: 'contain', flexShrink: 0 }}
                      />
                      <div className={styles.hospitalItemText}>
                        <span className={styles.hospitalNamePrimary}>{hospital.english || ''}</span>
                        <span className={styles.hospitalNameSecondary}>{hospital.arabic || ''}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className={styles.formGroup}>
            <input
              type="file"
              id="hospitalFile"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
            <label htmlFor="hospitalFile" className={styles.uploadButton}>
              رفع شعار مستشفى جديد (اختياري)
            </label>
            {newHospitalFile && <p className={styles.fileStatus}>تم اختيار الملف: {newHospitalFile.name}</p>}
          </div>

          {/* Selected hospital logo preview */}
          {selectedHospitalImage && (
            <div className={styles.formGroup}>
              <div className={styles.hospitalPreviewRow}>
                <Image
                  src={selectedHospitalImage}
                  alt="Hospital Logo Preview"
                  width={80}
                  height={80}
                  className={styles.hospitalPreviewImage}
                />
                <button type="button" onClick={() => setSelectedHospitalImage(null)} className={styles.removeLogoButton}>
                  إزالة الشعار
                </button>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className={styles.formGroup}>
            <input
              type="text"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="رقم الهاتف"
              required
            />
          </div>

          {/* SMS Option */}
          <div className={styles.formGroup}>
            <span className={styles.smsLabel}>هل تريد إرسال رسالة لهذا المستخدم؟</span>
            <div className={styles.radioGroup}>
              <div className={styles.radioOption}>
                <input
                  type="radio"
                  id="sendSMSTrue"
                  name="sendSMS"
                  value="true"
                  checked={sendSMS === true}
                  onChange={() => setSendSMS(true)}
                />
                <label htmlFor="sendSMSTrue">نعم</label>
              </div>
              <div className={styles.radioOption}>
                <input
                  type="radio"
                  id="sendSMSFalse"
                  name="sendSMS"
                  value="false"
                  checked={sendSMS === false}
                  onChange={() => setSendSMS(false)}
                />
                <label htmlFor="sendSMSFalse">لا</label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            إضافة الإجازة
          </button>
        </form>
      )}

      {/* Manage Leaves Section */}
      {newServiceCode === 'manageLeaves' && (
        <div className={styles.manageLeavesSection}>
          <div className={styles.searchControls}>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="أدخل رقم الهوية"
                onChange={(e) => setFetchIdNumber(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="أدخل رمز الخدمة"
                onChange={(e) => setFormData(prev => ({ ...prev, servicecode: e.target.value }))}
              />
            </div>
            <button onClick={loadLeavesCallback}>جلب الإجازات</button>
          </div>

          <ul className={styles.leavesList}>
            {leaves.map(leave => (
              <li key={leave._id}>
                {leave.name.arabic} - {new Date(leave.startDate).toLocaleDateString('en-GB')} إلى {new Date(leave.endDate).toLocaleDateString('en-GB')}
                {editingLeave === leave._id ? (
                  <form className={styles.leaveForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-servicecode`}>رمز الخدمة</label>
                      <input id={`edit-${leave._id}-servicecode`} type="text" name="servicecode" value={editingValue.servicecode || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-name-arabic`}>الاسم (عربي)</label>
                      <input id={`edit-${leave._id}-name-arabic`} type="text" name="name.arabic" value={editingValue.name?.arabic || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-name-english`}>الاسم (إنجليزي)</label>
                      <input id={`edit-${leave._id}-name-english`} type="text" name="name.english" value={editingValue.name?.english || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-issueDate`}>تاريخ الإصدار</label>
                      <input id={`edit-${leave._id}-issueDate`} type="date" name="issueDate" value={editingValue.issueDate || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-startDate`}>تاريخ البداية</label>
                      <input id={`edit-${leave._id}-startDate`} type="date" name="startDate" value={editingValue.startDate || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-endDate`}>تاريخ النهاية</label>
                      <input id={`edit-${leave._id}-endDate`} type="date" name="endDate" value={editingValue.endDate || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-leaveDuration`}>مدة الإجازة</label>
                      <input id={`edit-${leave._id}-leaveDuration`} type="number" name="leaveDuration" value={editingValue.leaveDuration || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-doctorName-arabic`}>اسم الطبيب (عربي)</label>
                      <input id={`edit-${leave._id}-doctorName-arabic`} type="text" name="doctorName.arabic" value={editingValue.doctorName?.arabic || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-doctorName-english`}>اسم الطبيب (إنجليزي)</label>
                      <input id={`edit-${leave._id}-doctorName-english`} type="text" name="doctorName.english" value={editingValue.doctorName?.english || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-jobTitle-arabic`}>المسمى الوظيفي (عربي)</label>
                      <input id={`edit-${leave._id}-jobTitle-arabic`} type="text" name="jobTitle.arabic" value={editingValue.jobTitle?.arabic || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-jobTitle-english`}>المسمى الوظيفي (إنجليزي)</label>
                      <input id={`edit-${leave._id}-jobTitle-english`} type="text" name="jobTitle.english" value={editingValue.jobTitle?.english || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-hospital-arabic`}>المستشفى (عربي)</label>
                      <input id={`edit-${leave._id}-hospital-arabic`} type="text" name="hospital.arabic" value={editingValue.hospital?.arabic || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-hospital-english`}>المستشفى (إنجليزي)</label>
                      <input id={`edit-${leave._id}-hospital-english`} type="text" name="hospital.english" value={editingValue.hospital?.english || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-phoneNumber`}>رقم الهاتف</label>
                      <input id={`edit-${leave._id}-phoneNumber`} type="text" name="phoneNumber" value={editingValue.phoneNumber || ''} onChange={handleEditChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor={`edit-${leave._id}-workPlace`}>جهة العمل</label>
                      <input id={`edit-${leave._id}-workPlace`} type="text" name="workPlace" value={editingValue.workPlace || ''} onChange={handleEditChange} />
                    </div>
                    <button type="button" onClick={() => handleUpdate(leave._id)}>تحديث</button>
                    <button type="button" onClick={cancelEditing}>إلغاء</button>
                  </form>
                ) : (
                  <>
                    <button onClick={() => startEditing(leave)}>تعديل</button>
                    <button onClick={() => handleDelete(leave._id)}>حذف</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Admin Form */}
      {newServiceCode === 'addAdmin' && (
        <form onSubmit={handleAdminSubmit} className={styles.leaveForm}>
          <div className={styles.formGroup}>
            <label htmlFor="adminIdNumber">رقم الهوية</label>
            <input type="text" id="adminIdNumber" name="idNumber" value={adminFormData.idNumber} onChange={handleAdminInputChange} placeholder="رقم الهوية" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="adminPassword">كلمة المرور</label>
            <input type="password" id="adminPassword" name="password" value={adminFormData.password} onChange={handleAdminInputChange} placeholder="كلمة المرور" required />
          </div>
          <button type="submit" disabled={loading}>إضافة مشرف</button>
        </form>
      )}

      {downloadLink && (
        <div className={styles.downloadSection}>
          <button onClick={handleDownload} className={styles.downloadButton}>تحميل الملف</button>
        </div>
      )}
      {successServiceCode && <p>تم إنشاء كود الخدمة بنجاح: {successServiceCode}</p>}
      {errorMessage && <p className="error">{errorMessage}</p>}
    </div>
  );
}
