import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, BookOpen, MessageSquare, Users, DollarSign } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import DashboardHome from './DashboardHome'
import Catalog from './admin/Catalog'
import ChatHub from './admin/ChatHub'
import CounterConsole from './admin/CounterConsole'
import MemberDirectory from './admin/MemberDirectory'
import FinesLedger from './admin/FinesLedger'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/librarian' },
  { icon: BookOpen,        label: 'Counter',   href: '/librarian/counter' },
  { icon: BookOpen,        label: 'Catalog',   href: '/librarian/catalog' },
  { icon: Users,           label: 'Members',   href: '/librarian/members' },
  { icon: DollarSign,      label: 'Fines',     href: '/librarian/fines' },
  { icon: MessageSquare,   label: 'Chat Hub',  href: '/librarian/chat' }
]

export default function LibrarianDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="counter" element={<CounterConsole />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="members" element={<MemberDirectory />} />
        <Route path="fines" element={<FinesLedger />} />
        <Route path="chat" element={<ChatHub />} />
      </Routes>
    </DashboardLayout>
  )
}
