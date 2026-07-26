import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../api/api';
import { Users, RefreshCw, X } from "lucide-react";

interface DBUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
  createdAt: string;
  status?: string;
}

export default function UsersTab() {
  const [dbUsers, setDbUsers] = useState<DBUser[]>([]);
  const [loadingUsers, setLoadingLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleCode, setEditRoleCode] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const fetchAllUsersFromDb = async () => {
    setLoadingLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`, 
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDbUsers(data);
      }
    } catch (error) {
      console.error("Lỗi kết nối API lấy Users:", error);
    } finally {
      setLoadingLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchAllUsersFromDb();
  }, []);

  const openEditModal = (user: DBUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditPhone(user.phone || "");
    setEditRoleCode(user.roleCode);
    setEditStatus(user.status || "ACTIVE");
  };

  const handleSaveUserFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${editingUser.id}/role`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode: editRoleCode, fullName: editFullName, phone: editPhone, status: editStatus })
      });
      if (response.ok) {
        setDbUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, roleCode: editRoleCode, fullName: editFullName, phone: editPhone, status: editStatus } : u));
        setEditingUser(null);
        alert("Đã lưu thông tin tài khoản thành công lên hệ thống!");
      } else {
        alert("Không thể lưu thông tin. Hãy kiểm tra lại Backend.");
      }
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      alert("Kết nối API thất bại.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-[#EADBC8] pb-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#D4AF37]" /> Quản Lý Danh Sách Thành Viên
        </h3>
        <button onClick={fetchAllUsersFromDb} className="px-4 py-2 hover:bg-[#FAF6F0] rounded-xl border border-[#EADBC8] flex items-center gap-1.5 text-xs font-bold text-[#5C4033] transition-all cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} /> Lấy dữ liệu mới
        </button>
      </div>

      {loadingUsers ? (
        <div className="py-20 text-center text-xs text-[#8B7E74] font-medium animate-pulse">🔄 Đang tải từ CSDL...</div>
      ) : (
        <div className="border border-[#EADBC8] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-[#FAF6F0] text-[#5C4033] font-bold uppercase border-b border-[#EADBC8]">
              <tr><th className="p-4 text-center">ID</th><th className="p-4">Họ Tên</th><th className="p-4">Email</th><th className="p-4 text-center">Trạng Thái</th><th className="p-4 text-center">Hành Động</th></tr>
            </thead>
            <tbody className="divide-y divide-[#EADBC8]/40">
              {dbUsers.map((user) => {
                const isSystemAdmin = user.email === 'admin@luxehome.vn';
                return (
                  <tr key={user.id} className="hover:bg-[#FAF6F0]/50">
                    <td className="p-4 text-center font-mono text-gray-400">#{user.id}</td>
                    <td className="p-4 font-bold text-[#1A1A1A]">{user.fullName}</td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        {user.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {isSystemAdmin ? <span className="text-[10px] text-gray-400 font-bold">Quyền Tối Cao</span> : (
                        <button onClick={() => openEditModal(user)} className="px-3 py-1.5 text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg font-bold cursor-pointer transition-colors">Sửa</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#FAF6F0] w-full max-w-md rounded-2xl border border-[#EADBC8] shadow-2xl p-6 relative">
            <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-[#8B7E74] hover:text-gray-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A] mb-4 border-b border-[#EADBC8] pb-2">Chỉnh sửa tài khoản</h3>
            <form onSubmit={handleSaveUserFromModal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#5C4033] font-bold mb-1">Họ tên *</label>
                <input type="text" required value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" />
              </div>
              <div>
                <label className="block text-[#5C4033] font-bold mb-1">Số điện thoại</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]" />
              </div>
              <div>
                <label className="block text-[#5C4033] font-bold mb-1">Quyền / Chức vụ</label>
                <select value={editRoleCode} onChange={e => setEditRoleCode(e.target.value)} className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]">
                  <option value="CUSTOMER">Khách Hàng</option>
                  <option value="STAFF">Nhân Viên</option>
                  <option value="MANAGER">Quản Lý</option>
                  <option value="ADMIN">Quản Trị Viên</option>
                  <option value="SALES_STAFF">Nhân viên bán hàng</option> 
                  <option value="WAREHOUSE_STAFF">Nhân viên kho</option>
                  <option value="SHIPPER">Đơn vị vận chuyển</option>
                </select>
              </div>
              <div>
                <label className="block text-[#5C4033] font-bold mb-1">Trạng thái tài khoản</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]">
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Khóa (INACTIVE)</option>
                </select>
              </div>
              <div className="flex justify-end pt-4 border-t border-[#EADBC8] mt-6">
                <button type="submit" className="px-6 py-2.5 bg-[#5C4033] hover:bg-[#4A3B32] text-white rounded-lg font-bold uppercase transition-colors cursor-pointer">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}