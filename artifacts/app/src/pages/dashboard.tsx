import { UserButton } from "@clerk/react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Smartphone } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Atendimento", path: "/atendimento", icon: MessageCircle },
  { name: "WhatsApp", path: "/whatsapp", icon: Smartphone },
  { name: "CRM", path: "/crm", icon: Users },
  { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#0F1923] flex flex-col z-10 sidebar-transition">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <MessageCircle className="w-6 h-6 text-[#25D366] mr-2" />
        <span className="text-white font-semibold text-lg tracking-wide">ZapCentral</span>
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                isActive 
                  ? "bg-[#25D366]/10 text-[#25D366] border-r-2 border-[#25D366]" 
                  : "text-[#8899A6] hover:text-white hover:bg-white/5"
              }`}>
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 flex items-center gap-3">
        <UserButton />
        <span className="text-sm text-[#8899A6] font-medium">Minha Conta</span>
      </div>
    </div>
  );
}

const mockConversations = [
  { id: 1, name: "Ana Silva", initials: "AS", dept: "Vendas", deptColor: "bg-blue-100 text-blue-700", status: "Aguardando", time: "2 min atrás" },
  { id: 2, name: "Carlos Mendes", initials: "CM", dept: "Suporte", deptColor: "bg-purple-100 text-purple-700", status: "Em Atendimento", time: "5 min atrás" },
  { id: 3, name: "Empresa XPTO", initials: "EX", dept: "Financeiro", deptColor: "bg-green-100 text-green-700", status: "Resolvido", time: "12 min atrás" },
  { id: 4, name: "Mariana Costa", initials: "MC", dept: "Vendas", deptColor: "bg-blue-100 text-blue-700", status: "Em Atendimento", time: "18 min atrás" },
  { id: 5, name: "Roberto Alves", initials: "RA", dept: "Suporte", deptColor: "bg-purple-100 text-purple-700", status: "Aguardando", time: "25 min atrás" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-[100dvh] bg-[#F4F7F8]">
      <Sidebar />
      
      <div className="ml-64 flex flex-col">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-0">
          <h1 className="text-xl font-semibold text-gray-800">Painel Principal</h1>
          <Badge variant="outline" className="text-xs font-medium bg-gray-50">
            Tenant: Matriz SP
          </Badge>
        </header>

        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversas Ativas</p>
                  <h3 className="text-2xl font-bold text-gray-900">24</h3>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Agentes Online</p>
                  <h3 className="text-2xl font-bold text-gray-900">8</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fila de Espera</p>
                  <h3 className="text-2xl font-bold text-gray-900">3</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Resolvidos Hoje</p>
                  <h3 className="text-2xl font-bold text-gray-900">142</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4">Atividade Recente</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockConversations.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                              {conv.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{conv.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={`border-none ${conv.deptColor}`}>
                          {conv.dept}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            conv.status === 'Resolvido' ? 'bg-green-500' :
                            conv.status === 'Em Atendimento' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-gray-600">{conv.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {conv.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
