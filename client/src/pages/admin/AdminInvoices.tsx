import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Invoice {
  id: number;
  subscriptionId: number;
  userId: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  subscription: {
    id: number;
    screenCount: number;
    durationYears: number;
  };
}

export default function AdminInvoices() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/admin/invoices'],
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/admin/invoices/${selectedInvoice?.id}`, {
        status: newStatus,
        paymentMethod: paymentMethod || undefined
      });
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الفاتورة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowUpdateDialog(false);
      setSelectedInvoice(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  });

  const filteredInvoices = invoices?.filter(inv => 
    filter === "all" || inv.status === filter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />مدفوعة</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-500 text-white"><Clock className="w-3 h-3 ml-1" />معلقة</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) || 0;
  const totalPending = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          الفواتير
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي المدفوع</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalPaid} ريال</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي المعلق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{totalPending} ريال</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">عدد الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48" data-testid="select-invoice-filter">
            <SelectValue placeholder="تصفية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفواتير</SelectItem>
            <SelectItem value="pending">المعلقة</SelectItem>
            <SelectItem value="paid">المدفوعة</SelectItem>
            <SelectItem value="cancelled">الملغاة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredInvoices?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد فواتير
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الاشتراك</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map(invoice => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell>#{invoice.id}</TableCell>
                    <TableCell>
                      {invoice.user.firstName || invoice.user.lastName 
                        ? `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim()
                        : invoice.user.email || 'بدون اسم'}
                    </TableCell>
                    <TableCell>
                      {invoice.subscription.screenCount} شاشة / {invoice.subscription.durationYears} سنة
                    </TableCell>
                    <TableCell className="font-semibold">{invoice.amount} ريال</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setNewStatus(invoice.status);
                          setPaymentMethod(invoice.paymentMethod || "");
                          setShowUpdateDialog(true);
                        }}
                        data-testid={`button-update-invoice-${invoice.id}`}
                      >
                        تحديث
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الفاتورة #{selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">الحالة</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'paid' && (
              <div>
                <label className="text-sm font-medium">طريقة الدفع</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="online">دفع إلكتروني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button 
              onClick={() => updateInvoiceMutation.mutate()}
              disabled={updateInvoiceMutation.isPending}
              className="w-full"
              data-testid="button-confirm-update-invoice"
            >
              {updateInvoiceMutation.isPending ? "جاري التحديث..." : "تحديث الفاتورة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
