import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, DollarSign, MessageSquare, UserCog } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import DashboardHome from './DashboardHome'
import Catalog from './admin/Catalog'
import MemberDirectory from './admin/MemberDirectory'
import FinesLedger from './admin/FinesLedger'
import ChatHub from './admin/ChatHub'
import CounterConsole from './admin/CounterConsole'
import LibrarianDirectory from './admin/LibrarianDirectory'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/admin' },
  { icon: BookOpen,        label: 'Counter',    href: '/admin/counter' },
  { icon: BookOpen,        label: 'Catalog',    href: '/admin/catalog' },
  { icon: Users,           label: 'Members',    href: '/admin/members' },
  { icon: UserCog,         label: 'Librarians', href: '/admin/librarians' },
  { icon: DollarSign,      label: 'Fines',      href: '/admin/fines' },
  { icon: MessageSquare,   label: 'Chat Hub',   href: '/admin/chat' }
]

export default function AdminDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="counter" element={<CounterConsole />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="members" element={<MemberDirectory />} />
        <Route path="librarians" element={<LibrarianDirectory />} />
        <Route path="fines" element={<FinesLedger />} />
        <Route path="chat" element={<ChatHub />} />
      </Routes>
    </DashboardLayout>
  )
}
