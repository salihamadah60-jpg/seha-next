"use client";

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function BodyStyleManager() {
  const pathname = usePathname();

  useEffect(() => {
    // إذا كنا في الصفحة الرئيسية، أضف الكلاس الخاص بها
    if (pathname === '/') {
      document.body.classList.add('home-page-body');
    } else {
      // إذا كنا في أي صفحة أخرى، قم بإزالة الكلاس ليعود للنمط الافتراضي
      document.body.classList.remove('home-page-body');
    }
  }, [pathname]); // يتم تشغيل هذا الكود كلما تغير مسار الصفحة

  return null; // هذا المكون لا يقوم بعرض أي شيء في الواجهة
}