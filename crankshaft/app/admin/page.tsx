"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Info,
  Loader2,
  Lock,
  LogOut,
  Package,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  TrendingUp,
  Tv,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { POSTER_CATEGORIES } from "@/lib/categories";

interface UserItem {
  _id: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  authProvider?: string;
  role: "user" | "admin";
  createdAt: string;
}

interface ProductItem {
  _id: string;
  name: string;
  price: number;
  category?: string;
  imageUrl: string;
  imageId: string;
  createdAt: string;
}

interface DisplayItem {
  key: string;
  posterUrl: string;
  posterName: string;
  updatedBy: string;
  updatedAt: string;
}

interface LogItem {
  _id: string;
  adminName: string;
  command: string;
  actionType: string;
  createdAt: string;
}

interface OrderItem {
  _id: string;
  orderId: string;
  userId?: string;
  items: Array<{
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }>;
  amount: number;
  expectedAmount: number;
  upilerifyOrderId?: string;
  checkoutUrl?: string;
  upiIntentUri?: string;
  status: "PENDING" | "PAID" | "FAILED";
  utr?: string;
  metadata?: any;
  paidAt?: string;
  createdAt: string;
}

interface OrderStats {
  totalRevenue: number;
  paidCount: number;
  allCount: number;
  pendingCount: number;
  totalItemsSold: number;
}

interface StakeholderRecord {
  _id: string;
  orderId: string;
  numberOfShares: number;
  totalPrice: number;
  pool?: "market" | "reserved";
  utr?: string;
  paidAt?: string;
  createdAt: string;
}

interface StakeholderItem {
  username: string;
  userId: string;
  totalShares: number;
  marketShares?: number;
  reservedShares?: number;
  poolLabel?: "Market" | "Founders/Reserved" | "Mixed";
  stakePercent: number;
  totalInvested: number;
  currentMarketValue?: number;
  ordersCount: number;
  firstGranted: string;
  lastGranted: string;
  records: StakeholderRecord[];
}

interface ShareStats {
  totalShares: number;
  totalCapital?: number;
  reservedShares?: number;
  maxPublicShares: number;
  soldShares: number;
  availableShares: number;
  soldPercent: number;
  reservedPercent: number;
  availablePercent: number;
  stakeholderCount: number;
  totalRevenue: number;
  pricePerShare?: number;
  isMarketValueDerived?: boolean;
  marketValueFormula?: string;
  dividendPool?: number;
  dividendPerShare?: number;
  dividendYieldPercent?: number;
  reasonForChange?: string;
  changeHistory?: Array<{
    previousCapital: number;
    newCapital: number;
    previousMarketValue: number;
    newMarketValue: number;
    reason: string;
    updatedBy: string;
    timestamp: string | Date;
  }>;
  totalCompanyValuation?: number;
  publicPoolValuation?: number;
  soldPoolValuation?: number;
  marketAllocated?: number;
  marketRemaining?: number;
  reservedTotal?: number;
  reservedAllocated?: number;
  reservedRemaining?: number;
  reservedSoldShares?: number;
  totalSoldShares?: number;
  totalAllocated?: number;
  totalRemaining?: number;
  reservedPoolValuation?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth / session state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    role: "user" | "admin" | "ghost";
  } | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const hasAdminAccess =
    currentUser?.role === "admin" || currentUser?.role === "ghost";

  // Active tab
  const [activeTab, setActiveTab] = useState<
    "users" | "display" | "products" | "orders" | "shares" | "terminal"
  >("users");

  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [display, setDisplay] = useState<DisplayItem | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalRevenue: 0,
    paidCount: 0,
    allCount: 0,
    pendingCount: 0,
    totalItemsSold: 0,
  });
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Shares management state
  const [stakeholders, setStakeholders] = useState<StakeholderItem[]>([]);
  const [shareStats, setShareStats] = useState<ShareStats | null>(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesSearchQuery, setSharesSearchQuery] = useState("");
  const [expandedStakeholder, setExpandedStakeholder] = useState<string | null>(
    null,
  );

  // Manual shares allocation modal state
  const [modalAddSharesOpen, setModalAddSharesOpen] = useState(false);
  const [addShareUsername, setAddShareUsername] = useState("");
  const [addShareCount, setAddShareCount] = useState<number | string>(10);
  const [addSharePool, setAddSharePool] = useState<"market" | "reserved">(
    "market",
  );
  const [addShareNotes, setAddShareNotes] = useState("");
  const [submittingShare, setSubmittingShare] = useState(false);
  const [shareGrantError, setShareGrantError] = useState("");

  // Capital & Financial valuation modification state
  const [modalCapitalOpen, setModalCapitalOpen] = useState(false);
  const [capitalInput, setCapitalInput] = useState<number | string>(20000);
  const [capitalReason, setCapitalReason] = useState("");
  const [updatingCapital, setUpdatingCapital] = useState(false);
  const [capitalError, setCapitalError] = useState("");

  // Notifications
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Form states
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState(
    "Cars and automotive",
  );
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null,
  );

  const [newPosterName, setNewPosterName] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  // Edit poster state
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("Cars and automotive");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [terminalInput, setTerminalInput] = useState("");
  const [terminalFilter, setTerminalFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check auth
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAuth(false);
      }
    }
    verifyAuth();
  }, []);

  // Fetch data when authenticated
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        console.error("[LOAD_USERS_FAIL] status:", res.status);
        return;
      }
      const data = await res.json();
      if (data.users) {
        setUsers(
          (data.users as UserItem[]).filter((u) => {
            const roleLower = String(u.role || "").toLowerCase();
            const userLower = String(u.username || "").toLowerCase();
            return roleLower !== "ghost" && userLower !== "ayaan_admin";
          }),
        );
      }
    } catch (err) {
      console.error("[LOAD_USERS_ERR]", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadDisplay = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/display");
      if (!res.ok) return;
      const data = await res.json();
      if (data.display) {
        setDisplay(data.display);
        setNewPosterName(data.display.posterName || "");
      }
    } catch {
      // Ignore network aborts or dev-server reload glitches
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) return;
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch {
      // Ignore network aborts or dev-server reload glitches
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/terminal");
      if (!res.ok) return;
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs as LogItem[]);
      }
    } catch {
      // Ignore network aborts or dev-server reload glitches
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) return;
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        if (data.stats) setOrderStats(data.stats);
      }
    } catch {
      // Ignore network aborts or dev-server reload glitches
    }
  }, []);

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res = await fetch("/api/admin/shares");
      if (!res.ok) return;
      const data = await res.json();
      if (data.stakeholders) setStakeholders(data.stakeholders);
      if (data.stats) setShareStats(data.stats);
    } catch {
      // Ignore network aborts or dev-server reload glitches
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAdminAccess) {
      loadUsers();
      loadDisplay();
      loadProducts();
      loadOrders();
      loadShares();
      loadLogs();
    }
  }, [
    hasAdminAccess,
    loadDisplay,
    loadLogs,
    loadOrders,
    loadProducts,
    loadShares,
    loadUsers,
  ]);

  // Live auto-polling when Terminal, Orders, or Shares tab is active, or refresh on Users tab
  useEffect(() => {
    if (activeTab === "users" && hasAdminAccess) {
      loadUsers();
    }
    if (activeTab === "terminal" && hasAdminAccess) {
      loadLogs();
      const timer = setInterval(loadLogs, 3500);
      return () => clearInterval(timer);
    }
    if (activeTab === "orders" && hasAdminAccess) {
      loadOrders();
      const timer = setInterval(loadOrders, 4000);
      return () => clearInterval(timer);
    }
    if (activeTab === "shares" && hasAdminAccess) {
      loadShares();
      const timer = setInterval(loadShares, 4000);
      return () => clearInterval(timer);
    }
  }, [activeTab, hasAdminAccess, loadLogs, loadOrders, loadShares, loadUsers]);

  const handleManualAddShares = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareGrantError("");
    const count = parseInt(String(addShareCount), 10);
    if (!addShareUsername.trim()) {
      setShareGrantError("Please enter a username or stakeholder name.");
      return;
    }
    if (Number.isNaN(count) || count < 1) {
      setShareGrantError("Number of shares must be at least 1.");
      return;
    }
    setSubmittingShare(true);
    try {
      const res = await fetch("/api/admin/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: addShareUsername.trim(),
          shares: count,
          notes: addShareNotes.trim(),
          pool: addSharePool,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShareGrantError(data.error || "Failed to allocate shares.");
        return;
      }
      showToast(
        data.message ||
          `Granted ${count} shares to @${addShareUsername.trim()}`,
      );
      setModalAddSharesOpen(false);
      setAddShareUsername("");
      setAddShareCount(10);
      setAddSharePool("market");
      setAddShareNotes("");
      await loadShares();
      loadLogs();
      loadOrders();
    } catch (err: any) {
      setShareGrantError(err.message || "Network error allocating shares.");
    } finally {
      setSubmittingShare(false);
    }
  };

  const handleRevokeShare = async (
    shareId: string,
    username: string,
    count: number,
  ) => {
    if (
      !confirm(
        `Are you sure you want to revoke ${count} shares from @${username}?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/shares?id=${shareId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to revoke share", "error");
        return;
      }
      showToast(data.message || `Revoked ${count} shares from @${username}`);
      await loadShares();
      loadLogs();
      loadOrders();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke share", "error");
    }
  };

  const handleUpdateCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCapital = parseFloat(String(capitalInput));
    if (
      Number.isNaN(parsedCapital) ||
      parsedCapital <= 0 ||
      !Number.isFinite(parsedCapital)
    ) {
      setCapitalError("Please enter a valid positive company capital amount.");
      return;
    }

    if (!capitalReason.trim() || capitalReason.trim().length < 3) {
      setCapitalError(
        "A mandatory reason for changing company capital is required for financial auditing.",
      );
      return;
    }

    setUpdatingCapital(true);
    setCapitalError("");

    try {
      const res = await fetch("/api/admin/shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalCapital: parsedCapital,
          reason: capitalReason.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCapitalError(data.error || "Failed to update company capital.");
        return;
      }

      showToast(
        data.message ||
          `Company capital updated to ₹${parsedCapital.toLocaleString()}`,
      );
      setModalCapitalOpen(false);
      setCapitalReason("");
      await loadShares();
      loadLogs();
    } catch (err: any) {
      setCapitalError(err.message || "Network error updating company capital.");
    } finally {
      setUpdatingCapital(false);
    }
  };

  // Handle role edit
  const handleRoleChange = async (
    userId: string,
    newRole: "user" | "admin",
  ) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update role", "error");
        return;
      }
      showToast(data.message || "Role updated successfully");
      loadUsers();
      loadLogs();
    } catch {
      showToast("Network error updating role", "error");
    }
  };

  // Upload to GridFS
  const uploadToGridFS = async (
    file: File,
  ): Promise<{ url: string; fileId: string }> => {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(
        "File size exceeds 15MB limit. Please upload a smaller image.",
      );
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Upload to GridFS failed");
    }
    return { url: data.url, fileId: data.fileId };
  };

  // Handle display poster change
  const handleUpdateDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        let finalUrl = display?.posterUrl || "/poster-ex.png";

        if (posterFile) {
          const uploaded = await uploadToGridFS(posterFile);
          finalUrl = uploaded.url;
        }

        const res = await fetch("/api/admin/display", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posterUrl: finalUrl,
            posterName: newPosterName || "Home Poster",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Failed to update poster", "error");
          return;
        }

        showToast("Display poster successfully updated!");
        setPosterFile(null);
        setPosterPreview(null);
        loadDisplay();
        loadLogs();
      } catch (err: any) {
        showToast(err.message || "Error updating poster", "error");
      }
    });
  };

  // Handle add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFile) {
      showToast("Please choose an image for the product", "error");
      return;
    }
    if (!newProductName.trim() || !newProductPrice) {
      showToast("Product name and price are required", "error");
      return;
    }

    startTransition(async () => {
      try {
        // Upload image to GridFS
        const uploadResult = await uploadToGridFS(productFile);

        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newProductName.trim(),
            price: parseFloat(newProductPrice),
            category: newProductCategory.trim() || "Classic",
            imageId: uploadResult.fileId,
            imageUrl: uploadResult.url,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Failed to create product", "error");
          return;
        }

        showToast(`Product "${newProductName}" added successfully!`);
        setNewProductName("");
        setNewProductPrice("");
        setNewProductCategory("Cars and automotive");
        setProductFile(null);
        setProductImagePreview(null);
        loadProducts();
        loadLogs();
      } catch (err: any) {
        showToast(err.message || "Error adding product", "error");
      }
    });
  };

  // Handle delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product?")) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to delete product", "error");
        return;
      }
      showToast("Product deleted");
      loadProducts();
      loadLogs();
    } catch {
      showToast("Failed to delete product", "error");
    }
  };

  // Open edit modal
  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditCategory(product.category || "Cars and automotive");
    setEditFile(null);
    setEditImagePreview(null);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditFile(null);
    setEditImagePreview(null);
  };

  // Handle save edited poster
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editName.trim() || !editPrice) {
      showToast("Poster name and price are required", "error");
      return;
    }

    startTransition(async () => {
      try {
        let finalImageId = editingProduct.imageId;
        let finalImageUrl = editingProduct.imageUrl;

        // If a new image was chosen, upload it to GridFS
        if (editFile) {
          const uploadResult = await uploadToGridFS(editFile);
          finalImageId = uploadResult.fileId;
          finalImageUrl = uploadResult.url;
        }

        const res = await fetch("/api/admin/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProduct._id,
            name: editName.trim(),
            price: parseFloat(editPrice),
            category: editCategory.trim(),
            imageId: finalImageId,
            imageUrl: finalImageUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Failed to update poster", "error");
          return;
        }

        showToast(`Poster "${editName}" updated successfully!`);
        closeEditModal();
        loadProducts();
        loadLogs();
      } catch (err: any) {
        showToast(err.message || "Error updating poster", "error");
      }
    });
  };

  // Handle terminal command submit
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    try {
      const cmd = terminalInput.trim();
      setTerminalInput("");
      const res = await fetch("/api/admin/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCommand: cmd }),
      });
      if (res.ok) {
        loadLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/auth?mode=login");
  };

  // Loading state
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030714] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d2ff]" />
      </div>
    );
  }

  // Access Denied if not admin / ghost
  if (!currentUser || !hasAdminAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#030714] text-white">
        <div className="max-w-md w-full p-8 rounded-2xl bg-black border border-neutral-800 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-sm text-neutral-400 mb-6">
            This dashboard is strictly accessible by authenticated
            administrators.
            {currentUser &&
              ` Current user "@${currentUser.username}" has role "${currentUser.role}".`}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth?mode=login"
              className="py-2.5 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
            >
              Sign In as Admin
            </Link>
            <Link
              href="/"
              className="py-2.5 px-4 rounded-xl border border-neutral-800 text-neutral-300 text-sm hover:bg-neutral-900 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#030714] text-white flex flex-col md:flex-row">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-black border border-neutral-700 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-black/90 md:bg-black border-r border-neutral-800 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between pb-6 border-b border-neutral-800 mb-6">
            <div>
              <Link
                href="/"
                className="text-lg font-bold tracking-tight text-white flex items-center gap-2"
              >
                <div className="relative w-6 h-6 rounded overflow-hidden shrink-0 flex items-center justify-center bg-black/40 border border-white/10">
                  <Image
                    src="/images/Crankshaft.png"
                    alt="CrankShaft"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span>CrankShaft</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono">
                  ADMIN
                </span>
              </Link>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Logged in as{" "}
                <strong className="text-white">@{currentUser.username}</strong>
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-1.5">
            {[
              { id: "users", label: "Users", icon: Users, count: users.length },
              { id: "display", label: "Display", icon: Tv },
              {
                id: "products",
                label: "Products",
                icon: Package,
                count: products.length,
              },
              {
                id: "orders",
                label: "Orders",
                icon: Receipt,
                count: orders.length,
              },
              {
                id: "shares",
                label: "Shares",
                icon: TrendingUp,
                count: shareStats?.stakeholderCount ?? stakeholders.length,
              },
              {
                id: "terminal",
                label: "Terminal",
                icon: TerminalIcon,
                count: logs.length,
              },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as any)}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                  transition-all duration-150
                  ${
                    activeTab === id
                      ? "bg-white text-black shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
                {count !== undefined && (
                  <span
                    className={`
                      text-[10px] px-2 py-0.5 rounded-full font-mono
                      ${activeTab === id ? "bg-black/10 text-black" : "bg-neutral-800 text-neutral-400"}
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-neutral-800 space-y-2 mt-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Website</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl">
        {/* TAB 1: USERS */}
        {activeTab === "users" && (
          <section className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Users Management
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  List of all registered users. Admin role can be assigned or
                  revoked here.
                </p>
              </div>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh users"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingUsers ? "animate-spin text-white" : ""}`}
                />
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-black overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Contact (Email / Phone)</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {loadingUsers ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-neutral-400"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Loading registered users...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {users.map((u) => (
                          <tr
                            key={u._id}
                            className="hover:bg-neutral-900/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                              {u.avatar ? (
                                <Image
                                  src={u.avatar}
                                  alt={u.username}
                                  width={28}
                                  height={28}
                                  className="w-7 h-7 rounded-full object-cover border border-neutral-700"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs text-white">
                                  {(u.username || "U")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span>{u.username}</span>
                                  {u._id === currentUser?.id && (
                                    <span className="text-[10px] text-neutral-500 font-normal">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                {u.authProvider === "google" && (
                                  <span className="text-[10px] text-blue-400 font-mono font-normal">
                                    Google Auth
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-neutral-400">
                              <div className="flex flex-col gap-0.5">
                                {u.email && (
                                  <span className="text-white text-[11px] font-sans">
                                    {u.email}
                                  </span>
                                )}
                                {u.phone && <span>{u.phone}</span>}
                                {!u.email && !u.phone && <span>—</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`
                                  inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase font-mono
                                  ${
                                    u.role === "admin"
                                      ? "bg-white text-black"
                                      : "bg-neutral-800 text-neutral-400"
                                  }
                                `}
                              >
                                {u.role === "admin" && (
                                  <ShieldCheck className="w-3 h-3" />
                                )}
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-neutral-500">
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    u._id,
                                    e.target.value as "user" | "admin",
                                  )
                                }
                                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-white transition-colors cursor-pointer"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-neutral-500"
                            >
                              No registered users found.
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: DISPLAY */}
        {activeTab === "display" && (
          <section className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Display Settings
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Manage the active poster displayed on the homepage right-hand 3D
                section.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Current Poster Preview */}
              <div className="p-6 rounded-2xl bg-black border border-neutral-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Active Homepage Poster
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Last updated by: {display?.updatedBy || "System"}
                  </span>
                </div>

                <div className="relative aspect-[3/4] max-h-[420px] mx-auto rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                  {display?.posterUrl ? (
                    <Image
                      src={posterPreview || display.posterUrl}
                      alt={display.posterName || "Homepage poster"}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-neutral-500">
                      No poster currently active
                    </span>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {display?.posterName}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    {display?.posterUrl}
                  </p>
                </div>
              </div>

              {/* Edit Display Poster Form */}
              <div className="p-6 rounded-2xl bg-black border border-neutral-800 shadow-xl space-y-5">
                <h3 className="text-sm font-bold text-white">
                  Change Display Poster
                </h3>
                <form onSubmit={handleUpdateDisplay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Poster Title / Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newPosterName}
                      onChange={(e) => setNewPosterName(e.target.value)}
                      placeholder="e.g. Vintage Le Mans 1970 Edition"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-white outline-none"
                    />
                  </div>

                  {/* GridFS Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Upload Poster Image (GridFS)
                    </label>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-neutral-400 group-hover:text-white mb-2 transition-colors" />
                      <span className="text-xs text-neutral-300 font-medium">
                        {posterFile
                          ? posterFile.name
                          : "Click to choose new poster file"}
                      </span>
                      <span className="text-[11px] text-neutral-500 mt-1">
                        PNG, JPG, WEBP stored directly in MongoDB GridFS
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            if (f.size > 15 * 1024 * 1024) {
                              showToast(
                                "Poster file exceeds 15MB limit",
                                "error",
                              );
                              return;
                            }
                            setPosterFile(f);
                            setPosterPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Uploading & Updating...</span>
                      </>
                    ) : (
                      <span>Apply as Home Poster</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: PRODUCTS */}
        {activeTab === "products" && (
          <section className="space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Products Management
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Add and manage poster products shown on the explore page. Stored
                with GridFS image uploads.
              </p>
            </div>

            {/* Add Product Form */}
            <div className="p-6 rounded-2xl bg-black border border-neutral-800 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add New Product (Image, Name, Price)</span>
              </h3>

              <form
                onSubmit={handleAddProduct}
                className="grid grid-cols-1 md:grid-cols-3 gap-5"
              >
                {/* Image Picker */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Product Image (GridFS)
                  </label>
                  <label className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer overflow-hidden relative group">
                    {productImagePreview ? (
                      <Image
                        src={productImagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="text-center p-3">
                        <Upload className="w-6 h-6 mx-auto text-neutral-400 group-hover:text-white mb-1.5" />
                        <span className="text-xs text-neutral-300 font-medium block">
                          Upload Image
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          GridFS Stored
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      required
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 15 * 1024 * 1024) {
                            showToast(
                              "Product image exceeds 15MB limit",
                              "error",
                            );
                            return;
                          }
                          setProductFile(f);
                          setProductImagePreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Name, Price & Submit */}
                <div className="md:col-span-2 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Product Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="e.g. 1968 Ford GT40 Gulf Heritage"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-white outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          placeholder="149.00"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-white outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                          Category (Theme & Type)
                        </label>
                        <select
                          value={newProductCategory}
                          onChange={(e) =>
                            setNewProductCategory(e.target.value)
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:border-white outline-none cursor-pointer"
                        >
                          {POSTER_CATEGORIES.map((theme) => (
                            <optgroup
                              key={theme.name}
                              label={`── ${theme.name.toUpperCase()} ──`}
                              className="bg-neutral-950 text-neutral-400 font-bold"
                            >
                              {theme.subcategories.map((cat) => (
                                <option
                                  key={cat}
                                  value={cat}
                                  className="bg-black text-white font-normal text-xs"
                                >
                                  {cat}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Uploading to GridFS & Saving...</span>
                      </>
                    ) : (
                      <span>Add Product to Catalog</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Product List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">
                  Current Products ({products.length})
                </h3>
                <button
                  onClick={loadProducts}
                  className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map((p) => (
                  <div
                    key={p._id}
                    className="rounded-2xl border border-neutral-800 bg-black overflow-hidden shadow-lg group hover:border-neutral-600 transition-all"
                  >
                    <div className="relative aspect-[3/4] bg-neutral-900">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white truncate flex-1">
                          {p.name}
                        </h4>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 shrink-0">
                          {p.category || "General"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          ₹{p.price.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Edit Poster"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p._id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="col-span-full py-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                    No products added yet. Use the form above to add your first
                    poster product!
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === "orders" && (
          <section className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Paid Orders Tracking
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Real-time ledger of orders verified and settled directly to
                  your bank account via UPIlerify.
                </p>
              </div>
              <button
                type="button"
                onClick={loadOrders}
                className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-black border border-neutral-800 shadow-lg space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Total Revenue
                </span>
                <div className="text-2xl font-black text-white font-mono flex items-center gap-1.5">
                  <span className="text-emerald-400">₹</span>
                  <span>{orderStats.totalRevenue.toFixed(2)}</span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Settled via UPI credit alerts</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black border border-neutral-800 shadow-lg space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Paid Orders
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  {orderStats.paidCount}
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {orderStats.pendingCount} pending / awaiting payment
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black border border-neutral-800 shadow-lg space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Posters Sold
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  {orderStats.totalItemsSold}
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Across all verified checkouts
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black border border-neutral-800 shadow-lg space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Average Order Value
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  ₹
                  {orderStats.paidCount > 0
                    ? (orderStats.totalRevenue / orderStats.paidCount).toFixed(
                        2,
                      )
                    : "0.00"}
                </div>
                <span className="text-[10px] text-[#00d2ff] font-mono">
                  0% aggregator transaction fees
                </span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, UTR, or Customer..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white placeholder-neutral-500 outline-none focus:border-white font-mono"
                />
              </div>

              <div className="text-xs text-neutral-400 font-mono">
                Showing{" "}
                <strong className="text-white">
                  {
                    orders
                      .filter(
                        (o) =>
                          o.metadata?.type !== "shares" &&
                          !o.items?.some(
                            (it: any) => it.productId === "shares",
                          ),
                      )
                      .filter((o) => {
                        const q = orderSearchQuery.toLowerCase();
                        return (
                          !q ||
                          o.orderId.toLowerCase().includes(q) ||
                          o.utr?.toLowerCase().includes(q) ||
                          o.userId?.toLowerCase().includes(q)
                        );
                      }).length
                  }
                </strong>{" "}
                merchandise orders
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {orders
                .filter(
                  (o) =>
                    o.metadata?.type !== "shares" &&
                    !o.items?.some((it: any) => it.productId === "shares"),
                )
                .filter((o) => {
                  const q = orderSearchQuery.toLowerCase();
                  return (
                    !q ||
                    o.orderId.toLowerCase().includes(q) ||
                    o.utr?.toLowerCase().includes(q) ||
                    o.userId?.toLowerCase().includes(q)
                  );
                })
                .map((order) => (
                  <div
                    key={order._id}
                    className="p-5 rounded-2xl bg-black border border-neutral-800 hover:border-neutral-700 transition-colors shadow-xl space-y-4"
                  >
                    {/* Order header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-900 gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white">
                          {order.orderId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PAID</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30">
                          UPIlerify
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          Customer:{" "}
                          <strong className="text-neutral-300">
                            @{order.userId || "guest"}
                          </strong>
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-neutral-400 font-mono">
                        {order.paidAt
                          ? `Paid: ${new Date(order.paidAt).toLocaleString()}`
                          : `Created: ${new Date(order.createdAt).toLocaleString()}`}
                      </div>
                    </div>

                    {/* Order items grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(order.items && order.items.length > 0
                        ? order.items
                        : []
                      ).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80"
                        >
                          <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 shrink-0">
                            {it.imageUrl ? (
                              <Image
                                src={it.imageUrl}
                                alt={it.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">
                                Poster
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">
                              {it.name}
                            </h5>
                            <span className="text-[11px] text-neutral-400 font-mono block">
                              Qty: {it.quantity || 1} × ₹
                              {Number(it.price).toFixed(2)}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ₹
                              {((it.quantity || 1) * Number(it.price)).toFixed(
                                2,
                              )}
                            </span>
                          </div>
                        </div>
                      ))}

                      {(!order.items || order.items.length === 0) && (
                        <div className="text-xs text-neutral-500 italic">
                          Poster items record not attached
                        </div>
                      )}
                    </div>

                    {/* Order footer row (Settled Amount & UTR) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-neutral-900 gap-3 bg-neutral-950/40 p-3 rounded-xl">
                      {/* UTR badge & copy */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400 font-mono">
                          Bank UTR:
                        </span>
                        {order.utr ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-xs text-white">
                            <span className="font-bold text-emerald-400">
                              {order.utr}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(order.utr || "");
                                setCopiedUtr(order.utr || "");
                                setTimeout(() => setCopiedUtr(null), 2000);
                              }}
                              className="p-0.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy UTR"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedUtr === order.utr && (
                              <span className="text-[9px] text-emerald-400">
                                Copied!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500 font-mono">
                            Pending match
                          </span>
                        )}
                      </div>

                      {/* Total Settled Amount */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 font-mono">
                          Settled Amount:
                        </span>
                        <div className="text-base font-black font-mono text-emerald-400">
                          ₹{(order.expectedAmount || order.amount).toFixed(2)}
                        </div>
                        {order.expectedAmount &&
                          order.amount &&
                          order.expectedAmount !== order.amount && (
                            <span className="text-[10px] text-[#00d2ff] font-mono">
                              (incl. ₹
                              {(order.expectedAmount - order.amount).toFixed(2)}{" "}
                              paisa offset)
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                ))}

              {orders.length === 0 && (
                <div className="py-20 text-center rounded-2xl border border-dashed border-neutral-800 bg-black/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 mx-auto">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    No Paid Orders Yet
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    Orders completed via the "Slide to pay" button will
                    automatically appear here once their bank credit-alert email
                    or UTR is verified.
                  </p>
                </div>
              )}

              {orders.length > 0 &&
                orders.filter((o) => {
                  const q = orderSearchQuery.toLowerCase();
                  return (
                    !q ||
                    o.orderId.toLowerCase().includes(q) ||
                    o.utr?.toLowerCase().includes(q) ||
                    o.userId?.toLowerCase().includes(q)
                  );
                }).length === 0 && (
                  <div className="py-12 text-center text-neutral-500 font-mono text-xs">
                    No orders match your search "{orderSearchQuery}".
                  </div>
                )}
            </div>
          </section>
        )}

        {/* TAB 5: SHARES */}
        {activeTab === "shares" && (
          <section className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Profit Shares & Stakeholders
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Direct profit participation registry. 10 shares = 1%
                      profit stake. 40% public pool (400 shares max).
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={loadShares}
                  className="p-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh Shares"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${sharesLoading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapitalInput(shareStats?.totalCapital ?? 1600);
                    setCapitalReason("");
                    setCapitalError("");
                    setModalCapitalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-300 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  title="Adjust Company Capital"
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Mkt: ₹{shareStats?.pricePerShare ?? 8}/sh</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    (Adjust Capital)
                  </span>
                  <Pencil className="w-3 h-3 text-emerald-400/80" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddShareUsername("");
                    setAddShareCount(10);
                    setAddShareNotes("");
                    setShareGrantError("");
                    setModalAddSharesOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Grant / Add Shares</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {/* Card 1: Market Value */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between text-neutral-400 text-xs">
                  <span className="font-semibold text-white">Market Value</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCapitalInput(shareStats?.totalCapital ?? 1600);
                      setCapitalReason("");
                      setCapitalError("");
                      setModalCapitalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    title="Adjust Capital"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Adjust Capital</span>
                  </button>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{shareStats?.pricePerShare ?? 8}{" "}
                  <span className="text-xs text-neutral-400 font-normal">
                    / share
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-800/60">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Lock className="w-3 h-3 text-cyan-400/80" />
                    <span>
                      {shareStats?.totalSoldShares ??
                        ((shareStats?.marketAllocated ?? 0) +
                          (shareStats?.reservedAllocated ?? 0) ||
                          200)}{" "}
                      shares bought
                    </span>
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                    Derived
                  </span>
                </div>
              </div>

              {/* Card 2: Stakeholders Count */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-400 text-xs">
                  <span>Stakeholders</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {shareStats?.stakeholderCount ?? stakeholders.length}
                </div>
                <div className="text-[10px] text-neutral-500">
                  Unique equity participants
                </div>
              </div>

              {/* Card 3: Market Shares Sold */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-400 text-xs">
                  <span>Market Pool</span>
                  <PieChart className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {shareStats?.marketAllocated ?? shareStats?.soldShares ?? 0}{" "}
                  <span className="text-xs text-neutral-500 font-normal">
                    / 400
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((shareStats?.marketAllocated ?? shareStats?.soldShares ?? 0) / 400) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-indigo-400 font-mono">
                  {shareStats?.marketRemaining ??
                    shareStats?.availableShares ??
                    400}{" "}
                  market shares open
                </div>
              </div>

              {/* Card 4: Founders / Reserved Shares Allocated */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-400 text-xs">
                  <span>Founders Pool</span>
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {shareStats?.reservedAllocated ?? 0}{" "}
                  <span className="text-xs text-neutral-500 font-normal">
                    / 600
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((shareStats?.reservedAllocated ?? 0) / 600) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-purple-400 font-mono">
                  {shareStats?.reservedRemaining ?? 600} reserved shares open
                </div>
              </div>

              {/* Card 5: Total Equity Distributed */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-400 text-xs">
                  <span>Total Allocated</span>
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  {shareStats?.totalAllocated ?? shareStats?.soldShares ?? 0}{" "}
                  <span className="text-xs text-neutral-500 font-normal">
                    / 1,000
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {(
                    ((shareStats?.totalAllocated ??
                      shareStats?.soldShares ??
                      0) /
                      1000) *
                    100
                  ).toFixed(1)}
                  % total company equity
                </div>
              </div>
            </div>

            {/* Search Bar & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search stakeholders by username..."
                  value={sharesSearchQuery}
                  onChange={(e) => setSharesSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors"
                />
                {sharesSearchQuery && (
                  <button
                    onClick={() => setSharesSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                Showing{" "}
                {
                  stakeholders.filter(
                    (s) =>
                      !sharesSearchQuery ||
                      s.username
                        .toLowerCase()
                        .includes(sharesSearchQuery.toLowerCase()),
                  ).length
                }{" "}
                of {stakeholders.length} stakeholders
              </div>
            </div>

            {/* Stakeholders Table / Registry */}
            <div className="space-y-3">
              {stakeholders.length === 0 ? (
                <div className="py-20 text-center rounded-2xl border border-dashed border-neutral-800 bg-black/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 mx-auto">
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    No Stakeholders Yet
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    Users who purchase shares via the website or whom you
                    manually allocate shares to will be listed here with their
                    equity stake percentages.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddShareUsername("");
                      setAddShareCount(10);
                      setAddShareNotes("");
                      setShareGrantError("");
                      setModalAddSharesOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manually Add First Stakeholder</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-black/50 overflow-hidden divide-y divide-neutral-800/80">
                  {stakeholders
                    .filter(
                      (s) =>
                        !sharesSearchQuery ||
                        s.username
                          .toLowerCase()
                          .includes(sharesSearchQuery.toLowerCase()),
                    )
                    .map((stakeholder) => {
                      const isExpanded =
                        expandedStakeholder === stakeholder.username;
                      const isRegisteredUser = users.some(
                        (u) =>
                          u.username.toLowerCase() ===
                          stakeholder.username.toLowerCase(),
                      );

                      return (
                        <div
                          key={stakeholder.username}
                          className="transition-colors hover:bg-neutral-900/30"
                        >
                          {/* Main Row */}
                          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Stakeholder Identity */}
                            <div className="flex items-center gap-3.5 min-w-[200px]">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-mono font-bold text-base shrink-0">
                                {stakeholder.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">
                                    @{stakeholder.username}
                                  </span>
                                  {isRegisteredUser ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                                      USER
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono">
                                      ALLOCATED
                                    </span>
                                  )}
                                  {stakeholder.poolLabel ===
                                  "Founders/Reserved" ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono">
                                      Founders Pool
                                    </span>
                                  ) : stakeholder.poolLabel === "Mixed" ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                                      Mixed Pools
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                                      Market Pool
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                  {stakeholder.ordersCount} allocation
                                  {stakeholder.ordersCount > 1 ? "s" : ""} ·
                                  First:{" "}
                                  {new Date(
                                    stakeholder.firstGranted,
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            {/* Shares & Stake Metrics */}
                            <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                              {/* Total Shares */}
                              <div>
                                <div className="text-[10px] text-neutral-500 font-mono uppercase">
                                  Shares Owned
                                </div>
                                <div className="text-base font-black text-white font-mono flex items-center gap-1.5 mt-0.5">
                                  <span>{stakeholder.totalShares}</span>
                                  <span className="text-xs text-neutral-500 font-normal">
                                    shares
                                  </span>
                                </div>
                              </div>

                              {/* Profit Stake % */}
                              <div>
                                <div className="text-[10px] text-neutral-500 font-mono uppercase">
                                  Profit Stake
                                </div>
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                                    <Sparkles className="w-3 h-3" />
                                    {stakeholder.stakePercent}%
                                  </span>
                                </div>
                              </div>

                              {/* Current Market Value & Capital Invested */}
                              <div>
                                <div className="text-[10px] text-neutral-500 font-mono uppercase">
                                  Current Value
                                </div>
                                <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                                  ₹
                                  {(
                                    stakeholder.totalShares *
                                    (shareStats?.pricePerShare ?? 20)
                                  ).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono">
                                  Cost: ₹
                                  {stakeholder.totalInvested.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddShareUsername(stakeholder.username);
                                  setAddShareCount(10);
                                  setAddShareNotes("");
                                  setShareGrantError("");
                                  setModalAddSharesOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Grant more shares to this user"
                              >
                                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Add More</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStakeholder(
                                    isExpanded ? null : stakeholder.username,
                                  )
                                }
                                className={`
                                  px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer
                                  ${isExpanded ? "bg-neutral-800 border-neutral-700 text-white" : "border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900"}
                                `}
                              >
                                <span>{isExpanded ? "Hide" : "Records"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Breakdown / Allocation Records */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-1 bg-black/60 border-t border-neutral-900 animate-in fade-in space-y-2">
                              <div className="text-[11px] font-mono text-neutral-500 mb-2 flex items-center justify-between">
                                <span>
                                  Allocation History for @{stakeholder.username}
                                  :
                                </span>
                                <span>
                                  {stakeholder.records?.length || 0}{" "}
                                  transaction(s)
                                </span>
                              </div>

                              <div className="space-y-2">
                                {stakeholder.records?.map((record) => (
                                  <div
                                    key={record._id}
                                    className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-white">
                                          {record.numberOfShares} shares (
                                          {(record.numberOfShares / 10).toFixed(
                                            1,
                                          )}
                                          % stake)
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border ${
                                            record.pool === "reserved"
                                              ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                              : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                          }`}
                                        >
                                          {record.pool === "reserved"
                                            ? "Founders/Reserved"
                                            : "Market"}
                                        </span>
                                        <span className="text-neutral-500 font-mono">
                                          ·
                                        </span>
                                        <span className="text-emerald-400 font-mono font-bold">
                                          ₹{record.totalPrice.toLocaleString()}
                                        </span>
                                        <span className="text-neutral-500 font-mono">
                                          ·
                                        </span>
                                        <span className="text-neutral-400 font-mono text-[11px]">
                                          {new Date(
                                            record.paidAt || record.createdAt,
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                                        <span>Order: {record.orderId}</span>
                                        {record.utr && (
                                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                            {record.utr}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRevokeShare(
                                            record._id,
                                            stakeholder.username,
                                            record.numberOfShares,
                                          )
                                        }
                                        className="px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Revoke</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 6: TERMINAL */}
        {activeTab === "terminal" && (
          <section className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Admin Terminal
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Audit trail of all administrative actions and commands
                  executed by admins.
                </p>
              </div>
              <button
                onClick={loadLogs}
                className="p-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
                title="Refresh terminal logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Terminal Window */}
            <div className="rounded-2xl border border-neutral-800 bg-black overflow-hidden shadow-2xl font-mono text-xs">
              {/* Window header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-neutral-400 text-[11px]">
                    admin@crankshaft:~ (audit_log.bash)
                  </span>
                </div>

                {/* Action Filters Inside Terminal */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { id: "ALL", label: "All Logs", count: logs.length },
                    {
                      id: "PRODUCT_UPDATE",
                      label: "Edits",
                      count: logs.filter(
                        (l) => l.actionType === "PRODUCT_UPDATE",
                      ).length,
                    },
                    {
                      id: "PRODUCT_CREATE",
                      label: "Added",
                      count: logs.filter(
                        (l) => l.actionType === "PRODUCT_CREATE",
                      ).length,
                    },
                    {
                      id: "PRODUCT_DELETE",
                      label: "Deleted",
                      count: logs.filter(
                        (l) => l.actionType === "PRODUCT_DELETE",
                      ).length,
                    },
                    {
                      id: "DISPLAY_UPDATE",
                      label: "Display",
                      count: logs.filter(
                        (l) => l.actionType === "DISPLAY_UPDATE",
                      ).length,
                    },
                    {
                      id: "ROLE_UPDATE",
                      label: "Roles",
                      count: logs.filter((l) => l.actionType === "ROLE_UPDATE")
                        .length,
                    },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTerminalFilter(filter.id)}
                      className={`
                        px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer select-none
                        ${
                          terminalFilter === filter.id
                            ? "bg-white text-black font-bold"
                            : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }
                      `}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Logs Body */}
              <div className="p-5 space-y-2.5 max-h-[500px] overflow-y-auto bg-black">
                <div className="text-neutral-500 pb-2 border-b border-neutral-900 flex items-center justify-between">
                  <span>
                    # Live audit console — tracking all admin changes in
                    real-time.
                  </span>
                  <span className="text-[10px] text-emerald-400 animate-pulse">
                    ● LIVE
                  </span>
                </div>

                {logs
                  .filter(
                    (log) =>
                      terminalFilter === "ALL" ||
                      log.actionType === terminalFilter,
                  )
                  .map((log) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-2.5 leading-relaxed hover:bg-neutral-900/30 p-1 rounded transition-colors"
                    >
                      {/* Timestamp */}
                      <span className="text-neutral-500 select-none shrink-0 font-mono text-[11px]">
                        {new Date(log.createdAt)
                          .toISOString()
                          .replace("T", " ")
                          .slice(0, 19)}
                      </span>

                      {/* Action Type Badge */}
                      {log.actionType === "PRODUCT_UPDATE" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#00d2ff]/15 text-[#00d2ff] border border-[#00d2ff]/30 shrink-0">
                          EDIT
                        </span>
                      )}
                      {log.actionType === "PRODUCT_CREATE" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          ADD
                        </span>
                      )}
                      {log.actionType === "PRODUCT_DELETE" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                          DEL
                        </span>
                      )}
                      {log.actionType === "DISPLAY_UPDATE" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                          DISPLAY
                        </span>
                      )}
                      {log.actionType === "ROLE_UPDATE" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
                          ROLE
                        </span>
                      )}
                      {log.actionType === "SYSTEM" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          CMD
                        </span>
                      )}

                      {/* Admin user */}
                      <span className="text-white font-bold select-none shrink-0 font-mono">
                        [{log.adminName}]
                      </span>

                      {/* Log command text */}
                      <span className="text-neutral-200 break-all">
                        {log.command}
                      </span>
                    </div>
                  ))}

                {logs.length === 0 && (
                  <div className="text-neutral-600 italic">
                    No admin commands logged yet.
                  </div>
                )}
                {logs.length > 0 &&
                  logs.filter(
                    (log) =>
                      terminalFilter === "ALL" ||
                      log.actionType === terminalFilter,
                  ).length === 0 && (
                    <div className="text-neutral-600 italic">
                      No logs matching the "{terminalFilter}" filter.
                    </div>
                  )}
              </div>

              {/* Command Prompt Input */}
              <form
                onSubmit={handleTerminalSubmit}
                className="flex items-center gap-2 px-4 py-3 bg-neutral-900/70 border-t border-neutral-800"
              >
                <span className="text-emerald-400 font-bold select-none">
                  $
                </span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Type a custom command note (e.g. Ayaan inspected poster inventory)..."
                  className="w-full bg-transparent text-white outline-none placeholder-neutral-600 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 transition-colors"
                >
                  Exec
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* ─── EDIT POSTER MODAL ────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-black border border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-6 text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#00d2ff]" />
                <h3 className="text-lg font-bold">Edit Poster Details</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Image Preview & Replace */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Poster Image (Keep current or upload new to GridFS)
                </label>
                <div className="flex gap-4 items-center">
                  <div className="relative w-24 h-32 shrink-0 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                    <Image
                      src={editImagePreview || editingProduct.imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center h-32 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer transition-colors p-3 text-center group">
                    <Upload className="w-5 h-5 text-neutral-400 group-hover:text-white mb-1 transition-colors" />
                    <span className="text-xs text-neutral-300 font-medium">
                      {editFile ? editFile.name : "Replace poster file"}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      Uploads to GridFS. Leave empty to keep existing image.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 15 * 1024 * 1024) {
                            showToast("Image exceeds 15MB limit", "error");
                            return;
                          }
                          setEditFile(f);
                          setEditImagePreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Poster Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Poster Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. 1968 Ford GT40 Gulf Heritage"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:border-white outline-none"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="149.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:border-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Category (Theme & Type)
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:border-white outline-none cursor-pointer"
                  >
                    {POSTER_CATEGORIES.map((theme) => (
                      <optgroup
                        key={theme.name}
                        label={`── ${theme.name.toUpperCase()} ──`}
                        className="bg-neutral-950 text-neutral-400 font-bold"
                      >
                        {theme.subcategories.map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            className="bg-black text-white font-normal text-xs"
                          >
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MANUAL GRANT SHARES MODAL ─────────────────────────────────── */}
      {modalAddSharesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-6 text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Manual Share Grant
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Allocate CrankShaft profit equity to a recipient
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAddSharesOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {shareGrantError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{shareGrantError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleManualAddShares} className="space-y-4">
              {/* Recipient / Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Recipient Username or Stakeholder Name
                </label>
                <input
                  type="text"
                  required
                  value={addShareUsername}
                  onChange={(e) => setAddShareUsername(e.target.value)}
                  placeholder="e.g. ayaansyed, seed_investor, or full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 outline-none font-mono"
                />

                {/* Quick select from registered users */}
                {users.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Registered users:
                    </span>
                    {users.slice(0, 6).map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => setAddShareUsername(u.username)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors border ${
                          addShareUsername === u.username
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"
                        }`}
                      >
                        @{u.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pool Selection Toggle Button (Decide Founders/Reserved vs Market) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Account Shares In Which Pool?
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setAddSharePool("market")}
                    className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addSharePool === "market"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="font-bold">Market Pool</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">
                      {shareStats?.marketRemaining ??
                        shareStats?.availableShares ??
                        400}{" "}
                      / 400 avail
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddSharePool("reserved")}
                    className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addSharePool === "reserved"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="font-bold">Founders / Reserved</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">
                      {shareStats?.reservedRemaining ?? 600} / 600 avail
                    </span>
                  </button>
                </div>
                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                  {addSharePool === "reserved"
                    ? "★ Drawing from 600 reserved founder shares (Admin Manual Input Only)."
                    : "• Drawing from 400 public market shares."}
                </p>
              </div>

              {/* Number of Shares */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Number of Shares
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Max:{" "}
                    {addSharePool === "reserved"
                      ? (shareStats?.reservedRemaining ?? 600)
                      : (shareStats?.marketRemaining ??
                        shareStats?.availableShares ??
                        400)}{" "}
                    available in{" "}
                    {addSharePool === "reserved" ? "Reserve" : "Market"}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={
                    addSharePool === "reserved"
                      ? (shareStats?.reservedRemaining ?? 600)
                      : (shareStats?.marketRemaining ??
                        shareStats?.availableShares ??
                        400)
                  }
                  required
                  value={addShareCount}
                  onChange={(e) => setAddShareCount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:border-indigo-500 outline-none font-mono font-bold"
                />

                {/* Quick pick pills */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {[
                    { count: 5, label: "+5 (0.5%)" },
                    { count: 10, label: "+10 (1.0%)" },
                    { count: 20, label: "+20 (2.0%)" },
                    { count: 50, label: "+50 (5.0%)" },
                    { count: 100, label: "+100 (10%)" },
                  ].map((preset) => {
                    const currentPoolMax =
                      addSharePool === "reserved"
                        ? (shareStats?.reservedRemaining ?? 600)
                        : (shareStats?.marketRemaining ??
                          shareStats?.availableShares ??
                          400);
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => setAddShareCount(preset.count)}
                        disabled={preset.count > currentPoolMax}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors border disabled:opacity-30 ${
                          Number(addShareCount) === preset.count
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Calculated Equity Stake:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{(Math.max(0, Number(addShareCount) || 0) / 10).toFixed(1)}
                    % profit share
                  </span>
                </div>
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Total Equivalent Valuation:</span>
                  <span className="font-mono font-bold text-white">
                    ₹
                    {(
                      Math.max(0, Number(addShareCount) || 0) *
                      (shareStats?.pricePerShare ?? 20)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400 pt-1 border-t border-indigo-500/20">
                  <span>
                    {addSharePool === "reserved"
                      ? "Founders/Reserved Pool Capacity:"
                      : "Market Pool Capacity:"}
                  </span>
                  <span className="font-mono">
                    {(addSharePool === "reserved"
                      ? (shareStats?.reservedRemaining ?? 600)
                      : (shareStats?.marketRemaining ??
                        shareStats?.availableShares ??
                        400)) - (Number(addShareCount) || 0)}{" "}
                    shares remaining
                  </span>
                </div>
              </div>

              {/* Reference Notes (optional) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Internal Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={addShareNotes}
                  onChange={(e) => setAddShareNotes(e.target.value)}
                  placeholder="e.g. Early advisor agreement, offline cash UPI settlement"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:border-indigo-500 outline-none font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalAddSharesOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingShare}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-900/40"
                >
                  {submittingShare ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Allocating Shares...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Allocate Shares</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADJUST COMPANY CAPITAL MODAL (FINANCIAL GOVERNANCE) ───────── */}
      {modalCapitalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 text-white max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Adjust Company Capital
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Recalibrate company valuation and derived market value per
                    share
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCapitalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {capitalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{capitalError}</span>
              </div>
            )}

            {/* Current Metrics Banner */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">
                  Active Capital
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ₹{(shareStats?.totalCapital ?? 20000).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">
                  Derived Market Value
                </span>
                <div className="flex items-center justify-end gap-1.5 text-lg font-black text-white font-mono">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>₹{shareStats?.pricePerShare ?? 20}</span>
                  <span className="text-xs text-neutral-500 font-normal">
                    / sh
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateCapital} className="space-y-4">
              {/* Field 1: Capital Input (Editable) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  New Company Capital (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={capitalInput}
                    onChange={(e) => setCapitalInput(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-base text-white focus:border-emerald-500 outline-none font-mono font-bold"
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2.5 space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Capital Valuation Presets:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1600, 2000, 3000, 5000, 10000, 20000].map((preset) => {
                      const totalBought = Number(
                        shareStats?.totalSoldShares ??
                          ((shareStats?.marketAllocated ?? 0) +
                            (shareStats?.reservedAllocated ?? 0) ||
                            200),
                      );
                      const denom = totalBought > 0 ? totalBought : 1000;
                      const presetPerShare = preset / denom;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCapitalInput(preset)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-semibold transition-colors border cursor-pointer ${
                            Number(capitalInput) === preset
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : "bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800"
                          }`}
                        >
                          ₹{preset.toLocaleString()} (₹
                          {presetPerShare.toFixed(1)}/sh)
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Field 2: Derived Market Value (STRICTLY READ-ONLY / NON-UPDATEABLE) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Derived Market Value per Share (Non-Updateable)</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                    Locked • Auto-Derived
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`${((parseFloat(String(capitalInput)) || 0) / (shareStats?.totalSoldShares || (shareStats?.marketAllocated ?? 0) + (shareStats?.reservedAllocated ?? 0) || 200)).toFixed(2)} per share`}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-cyan-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                  />
                </div>
              </div>

              {/* Field 4: Mandatory Reason for Capital Change */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span>Reason for Capital Change</span>
                    <span className="text-red-400 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                    Mandatory
                  </span>
                </div>
                <textarea
                  rows={2}
                  required
                  value={capitalReason}
                  onChange={(e) => setCapitalReason(e.target.value)}
                  placeholder="e.g. Seed equity injection, Q3 valuation update, new inventory asset capitalization, shareholder expansion..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 outline-none font-mono resize-none shadow-inner"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Always required for audit logs and regulatory transparency.
                </p>
              </div>

              {/* Live Projected Valuation Impact */}
              {(() => {
                const totalBought = Number(
                  shareStats?.totalSoldShares ??
                    ((shareStats?.marketAllocated ?? 0) +
                      (shareStats?.reservedAllocated ?? 0) ||
                      200),
                );
                const denom = totalBought > 0 ? totalBought : 1000;
                const currentCapital = parseFloat(String(capitalInput)) || 0;
                const derivedSharePrice = currentCapital / denom;
                return (
                  <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1.5 font-mono text-xs">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Live Valuation Recalibration
                    </div>
                    <div className="flex justify-between text-neutral-300 text-[11px]">
                      <span>1 Share Value (Derived):</span>
                      <span className="font-bold text-white">
                        ₹{derivedSharePrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-300 text-[11px]">
                      <span>10 Shares (1% Company Stake):</span>
                      <span className="font-bold text-white">
                        ₹
                        {(derivedSharePrice * 10).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-300 text-[11px]">
                      <span>Total Bought ({totalBought} Shares):</span>
                      <span className="font-bold text-indigo-300">
                        ₹
                        {(derivedSharePrice * totalBought).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-200 pt-1.5 border-t border-emerald-500/20 font-bold text-xs">
                      <span>Total Capital Valuation:</span>
                      <span className="text-emerald-400">
                        ₹{currentCapital.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalCapitalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    updatingCapital ||
                    !capitalInput ||
                    Number(capitalInput) <= 0 ||
                    !capitalReason.trim()
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-900/40"
                >
                  {updatingCapital ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying Capital & Derived Value...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Company Capital</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Audit Change History */}
            {shareStats?.changeHistory &&
              shareStats.changeHistory.length > 0 && (
                <div className="pt-3 border-t border-neutral-850">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-2">
                    Recent Capital Audit Trail (
                    {shareStats.changeHistory.length})
                  </span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {shareStats.changeHistory
                      .slice()
                      .reverse()
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-black/40 border border-neutral-850 text-[11px] font-mono space-y-1"
                        >
                          <div className="flex items-center justify-between text-neutral-400">
                            <span className="text-emerald-400 font-bold">
                              ₹{item.previousCapital.toLocaleString()} → ₹
                              {item.newCapital.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-neutral-300 text-[10px]">
                            <strong>Reason:</strong> {item.reason}
                          </div>
                          <div className="text-[9px] text-neutral-500">
                            By @{item.updatedBy} • Mkt Val: ₹
                            {item.previousMarketValue} → ₹{item.newMarketValue}
                            /sh
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
