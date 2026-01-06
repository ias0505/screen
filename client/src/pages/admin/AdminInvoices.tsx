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
import { useLanguage } from "@/hooks/use-language";
import { SARIcon } from "@/components/ui/price";
import { FileText, ArrowRight, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

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
  const { language } = useLanguage();
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
      toast({ title: language === 'ar' ? "تم تحديث الفاتورة بنجاح" : "Invoice updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowUpdateDialog(false);
      setSelectedInvoice(null);
    },
    onError: () => {
      toast({ title: language === 'ar' ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  });

  const filteredInvoices = invoices?.filter(inv => 
    filter === "all" || inv.status === filter
  );

  const dateLocale = language === 'ar' ? ar : enUS;
  const noName = language === 'ar' ? 'بدون اسم' : 'No name';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />{language === 'ar' ? "مدفوعة" : "Paid"}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-500 text-white"><Clock className="w-3 h-3 ml-1" />{language === 'ar' ? "معلقة" : "Pending"}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />{language === 'ar' ? "ملغاة" : "Cancelled"}</Badge>;
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
          {language === 'ar' ? "الفواتير" : "Invoices"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي المدفوع" : "Total Paid"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 inline-flex items-center gap-1">{totalPaid} <SARIcon size={16} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "إجمالي المعلق" : "Total Pending"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 inline-flex items-center gap-1">{totalPending} <SARIcon size={16} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'ar' ? "عدد الفواتير" : "Invoice Count"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48" data-testid="select-invoice-filter">
            <SelectValue placeholder={language === 'ar' ? "تصفية" : "Filter"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? "جميع الفواتير" : "All Invoices"}</SelectItem>
            <SelectItem value="pending">{language === 'ar' ? "المعلقة" : "Pending"}</SelectItem>
            <SelectItem value="paid">{language === 'ar' ? "المدفوعة" : "Paid"}</SelectItem>
            <SelectItem value="cancelled">{language === 'ar' ? "الملغاة" : "Cancelled"}</SelectItem>
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
              {language === 'ar' ? "لا توجد فواتير" : "No invoices"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "المستخدم" : "User"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الاشتراك" : "Subscription"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map(invoice => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell>#{invoice.id}</TableCell>
                    <TableCell>
                      {invoice.user.firstName || invoice.user.lastName 
                        ? `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim()
                        : invoice.user.email || noName}
                    </TableCell>
                    <TableCell>
                      {invoice.subscription.screenCount} {language === 'ar' ? "شاشة" : "screens"} / {invoice.subscription.durationYears} {language === 'ar' ? "سنة" : "year(s)"}
                    </TableCell>
                    <TableCell className="font-semibold"><span className="inline-flex items-center gap-1">{invoice.amount} <SARIcon size={12} /></span></TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/invoice/${invoice.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
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
                          {language === 'ar' ? "تحديث" : "Update"}
                        </Button>
                      </div>
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
            <DialogTitle>
              {language === 'ar' ? `تحديث حالة الفاتورة #${selectedInvoice?.id}` : `Update Invoice #${selectedInvoice?.id} Status`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{language === 'ar' ? "الحالة" : "Status"}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{language === 'ar' ? "معلقة" : "Pending"}</SelectItem>
                  <SelectItem value="paid">{language === 'ar' ? "مدفوعة" : "Paid"}</SelectItem>
                  <SelectItem value="cancelled">{language === 'ar' ? "ملغاة" : "Cancelled"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'paid' && (
              <div>
                <label className="text-sm font-medium">{language === 'ar' ? "طريقة الدفع" : "Payment Method"}</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder={language === 'ar' ? "اختر طريقة الدفع" : "Select payment method"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{language === 'ar' ? "نقداً" : "Cash"}</SelectItem>
                    <SelectItem value="bank_transfer">{language === 'ar' ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                    <SelectItem value="online">{language === 'ar' ? "دفع إلكتروني" : "Online Payment"}</SelectItem>
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
              {updateInvoiceMutation.isPending 
                ? (language === 'ar' ? "جاري التحديث..." : "Updating...")
                : (language === 'ar' ? "تحديث الفاتورة" : "Update Invoice")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
