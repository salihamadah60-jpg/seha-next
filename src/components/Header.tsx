"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Header.module.css';

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <Image src="/se.png" alt="شعار صحة" width={150} height={50} priority />
            </div>
            <div className={styles.hamburger} onClick={toggleMenu}>
                <div className={styles.line}></div>
                <div className={styles.line}></div>
                <div className={styles.line}></div>
            </div>
            <div className={`${styles.hamburgerDropdown} ${menuOpen ? styles.active : ''}`}>
                <span className={styles.closeBtn} onClick={toggleMenu}>&times;</span>
                {/* تم تحديث الروابط بناءً على طلبك */}
                <Link href="/admin-dashboard" onClick={toggleMenu}>الخدمات</Link>
                <Link href="/" onClick={toggleMenu}>الاستعلامات</Link>
                <Link href="/register" onClick={toggleMenu}>إنشاء حساب</Link>
                <button
                    onClick={() => {
                        window.open('https://www.seha.sa/#/account/login', '_blank', 'noopener,noreferrer');
                        toggleMenu();
                    }}
                >
                    تسجيل الدخول
                </button>
            </div>
        </header>
    );
};

export default Header;