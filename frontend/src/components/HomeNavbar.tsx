import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Trang chủ', href: '#home' },
  { label: 'Tính năng', href: '#features' },
  { label: 'Quy trình', href: '#process' },
  { label: 'Xem trước', href: '#preview' },
  { label: 'Liên hệ', href: '#contact' },
];

const SCROLL_HIDE_THRESHOLD = 96;
const DIRECTION_THRESHOLD = 10;

function HomeNavbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      const isNearTop = currentScrollY < 24;

      setIsAtTop(isNearTop);

      if (isNearTop) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (Math.abs(delta) < DIRECTION_THRESHOLD) {
        return;
      }

      if (delta > 0 && currentScrollY > SCROLL_HIDE_THRESHOLD) {
        setIsVisible(false);
      } else if (delta < 0) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={`navbar navbar--floating${isVisible ? ' navbar--visible' : ' navbar--hidden'}${isAtTop ? ' navbar--top' : ' navbar--scrolled'}`}
    >
      <div className="container navbar__inner">
        <a href="#home" className="navbar__brand">
          <span className="navbar__brand-mark">TP</span>
          <div>
            <strong>TimeSheet Pro</strong>
            <span>Smart Time Tracking</span>
          </div>
        </a>

        <nav className="navbar__menu">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="navbar__link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <Link to="/login" className="button button--ghost">
            Đăng nhập
          </Link>
          <Link to="/login?mode=get-started" className="button button--primary">
            Bắt đầu
          </Link>
        </div>
      </div>
    </header>
  );
}

export default HomeNavbar;
