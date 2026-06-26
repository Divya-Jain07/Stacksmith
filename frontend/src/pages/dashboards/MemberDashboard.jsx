import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, MessageSquare } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'

import MemberDashboardHome from './member/MemberDashboardHome'
import MemberCatalog from './member/MemberCatalog'
import MemberChatHub from './member/MemberChatHub'
import MemberHistory from './member/MemberHistory'
import { History } from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/member' },
  { icon: BookOpen,        label: 'Catalog',       href: '/member/catalog' },
  { icon: MessageSquare,   label: 'Helpdesk Chat', href: '/member/chat' },
  { icon: History,         label: 'History',       href: '/member/history' }
]

export default function MemberDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Routes>
        <Route path="/" element={<MemberDashboardHome />} />
        <Route path="/catalog" element={<MemberCatalog />} />
        <Route path="/chat" element={<MemberChatHub />} />
        <Route path="/history" element={<MemberHistory />} />
        <Route path="*" element={<Navigate to="/member" replace />} />
      </Routes>
    </DashboardLayout>
  )
}
