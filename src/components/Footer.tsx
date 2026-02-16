import React from 'react';
import Image from 'next/image';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <Image src="/lean.png" alt="شعار Lean" width={80} height={50} className={styles.footerImg1} />
                <div className={styles.verticalLine}></div>
                <Image src="/MOF.png" alt="شعار MOF" width={100} height={80} className={styles.footerImg2} />
            </div>
            <p className={styles.ft}>منصة صحة معتمدة من قبل وزارة الصحة &copy; 2025</p>
            <div className={styles.footerLinks}>
                <a href="https://www.seha.sa/files/T_Cs_v3.pdf" className={styles.footerLink} target="_blank" rel="noopener noreferrer">سياسة الخصوصية وشروط الإستخدام</a>
                <span>|</span>
                <a href="https://seha.sa/Content/LandingPages/UserManual.pdf" className={styles.footerLink} target="_blank" rel="noopener noreferrer">دليل الاستخدام</a>
            </div>
            <div className={styles.footerSocial}>
                <div className={styles.socialIcons}>
                    <a href="https://wa.me/+966545909461" target="_blank" rel="noopener noreferrer">
                        <Image src="/wh.png" alt="WhatsApp" width={24} height={24} className={styles.socialIcon} />
                    </a>
                    <a href="https://twitter.com/seha_services" target="_blank" rel="noopener noreferrer">
                        <Image src="/T.png" alt="Twitter" width={24} height={24} className={styles.socialIcon} />
                    </a>
                    <a href="https://www.youtube.com/channel/UCb9ZrS2YcriYqIPIHNp9wcQ" target="_blank" rel="noopener noreferrer">
                        <Image src="/you.png" alt="YouTube" width={24} height={24} className={styles.socialIcon} />
                    </a>
                </div>
                <div className={styles.contactInfo}>
                    <span>920002005</span>
                    <span>|</span>
                    <span>support@seha.sa</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;