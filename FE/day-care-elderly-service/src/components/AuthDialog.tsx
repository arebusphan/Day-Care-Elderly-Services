import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export const AuthDialog: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    switchAuthModalMode,
    login,
    register,
    getDashboardUrl,
  } = useAuth();

  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMsg(null);
      setSuccessMsg(null);
      closeAuthModal();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Email và Mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      const loggedUser = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      const roleDisplay = loggedUser.roles.join(", ") || "Người dùng";
      setSuccessMsg(`Đăng nhập thành công với vai trò: ${roleDisplay}! Đang chuyển hướng...`);

      const targetPath = getDashboardUrl(loggedUser);
      setTimeout(() => {
        closeAuthModal();
        navigate(targetPath);
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.join("; ") ||
        err?.message ||
        "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản & mật khẩu.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg("Vui lòng điền họ tên, email và mật khẩu.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("Mật khẩu cần tối thiểu 6 ký tự.");
      return;
    }

    try {
      setLoading(true);
      const loggedUser = await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhone.trim() || undefined,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      setSuccessMsg("Đăng ký thành công! Đang chuyển hướng vào hệ thống...");
      const targetPath = getDashboardUrl(loggedUser);
      setTimeout(() => {
        closeAuthModal();
        navigate(targetPath);
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.join("; ") ||
        err?.message ||
        "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={isAuthModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-7">
        <DialogHeader className="text-center space-y-1.5 pb-2 border-b border-slate-100">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800">
            {authModalMode === "login" ? "Chào Mừng Trở Lại" : "Tạo Tài Khoản Mới"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            {authModalMode === "login"
              ? "Đăng nhập để vào bảng điều khiển vai trò của bạn"
              : "Đăng ký để sử dụng các dịch vụ chăm sóc người cao tuổi"}
          </DialogDescription>

          {/* Switch tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mt-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                switchAuthModalMode("login");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                authModalMode === "login"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                switchAuthModalMode("register");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                authModalMode === "register"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đăng ký
            </button>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {authModalMode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="admin@daycare.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  Mật khẩu
                </Label>
                <button
                  type="button"
                  onClick={() => alert("Vui lòng liên hệ Admin để đặt lại mật khẩu.")}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-9 pr-10 py-2 text-sm rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng Nhập Ngay"
              )}
            </Button>
          </form>
        )}

        {/* REGISTER FORM */}
        {authModalMode === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Họ và Tên
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-xl border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="nguyenvana@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-xl border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Số Điện Thoại
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="0912345678"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="pl-9 pr-2 py-2 text-sm rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  Xác nhận
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="pl-9 pr-2 py-2 text-sm rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              * Mặc định tài khoản đăng ký mới sẽ có vai trò Người thân (FamilyMember).
            </p>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang khởi tạo tài khoản...
                </>
              ) : (
                "Đăng Ký Tài Khoản"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
