import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Printer, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InvoiceDetails {
  id: number;
  invoiceNumber: string | null;
  subscriptionId: number;
  userId: string;
  amount: number;
  baseAmount: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  subscription: {
    id: number;
    screenCount: number;
    durationYears: number;
    pricePerScreen: number;
  } | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
}

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  
  const { data: invoice, isLoading, error } = useQuery<InvoiceDetails>({
    queryKey: ['/api/invoices', id],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            مدفوعة
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            معلقة
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            ملغاة
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-xl font-bold text-destructive">الفاتورة غير موجودة</h1>
        <Link href="/subscriptions">
          <Button variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للاشتراكات
          </Button>
        </Link>
      </div>
    );
  }

  // Handle tax calculation - for legacy invoices without tax fields, back-calculate
  const hasNewTaxFields = invoice.baseAmount !== null && invoice.taxAmount !== null;
  const taxRate = invoice.taxRate ?? 10;
  
  let baseAmount: number;
  let taxAmount: number;
  let totalAmount: number;
  
  if (hasNewTaxFields) {
    // New invoice with tax fields
    baseAmount = invoice.baseAmount!;
    taxAmount = invoice.taxAmount!;
    totalAmount = invoice.amount;
  } else {
    // Legacy invoice - assume amount is tax-inclusive and back-calculate
    totalAmount = invoice.amount;
    baseAmount = Math.round(totalAmount * 100 / (100 + taxRate));
    taxAmount = totalAmount - baseAmount;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href="/subscriptions">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
          </Link>
          <Button onClick={handlePrint} className="gap-2" data-testid="button-print-invoice">
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h1 className="text-2xl font-bold text-foreground">فاتورة ضريبية مبسطة</h1>
                <p className="text-sm text-muted-foreground mt-1">Simplified Tax Invoice</p>
              </div>
              <div className="text-left">
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">معلومات الفاتورة</h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">رقم الفاتورة: </span>
                    <span className="font-medium" data-testid="text-invoice-number">
                      {invoice.invoiceNumber || `INV-${String(invoice.id).padStart(4, '0')}`}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">التاريخ: </span>
                    <span className="font-medium">
                      {format(new Date(invoice.createdAt), 'dd MMMM yyyy', { locale: ar })}
                    </span>
                  </p>
                  {invoice.paidAt && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">تاريخ الدفع: </span>
                      <span className="font-medium">
                        {format(new Date(invoice.paidAt), 'dd MMMM yyyy', { locale: ar })}
                      </span>
                    </p>
                  )}
                  {invoice.paymentMethod && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">طريقة الدفع: </span>
                      <span className="font-medium">
                        {invoice.paymentMethod === 'cash' ? 'نقداً' : 
                         invoice.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 
                         invoice.paymentMethod === 'online' ? 'دفع إلكتروني' : invoice.paymentMethod}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">معلومات العميل</h3>
                <div className="space-y-1">
                  {invoice.user?.companyName && (
                    <p className="text-sm font-medium">{invoice.user.companyName}</p>
                  )}
                  <p className="text-sm">
                    {invoice.user?.firstName || ''} {invoice.user?.lastName || ''}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.user?.email}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">تفاصيل الخدمة</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">الوصف</th>
                      <th className="text-center p-3 font-medium">الكمية</th>
                      <th className="text-center p-3 font-medium">السعر</th>
                      <th className="text-left p-3 font-medium">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">اشتراك شاشات العرض</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.subscription?.screenCount} شاشة × {invoice.subscription?.durationYears} سنة
                          </p>
                        </div>
                      </td>
                      <td className="text-center p-3">{invoice.subscription?.screenCount || 1}</td>
                      <td className="text-center p-3">{invoice.subscription?.pricePerScreen || 50} ريال</td>
                      <td className="text-left p-3 font-medium">{baseAmount} ريال</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span>{baseAmount} ريال</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة ({taxRate}%):</span>
                  <span data-testid="text-tax-amount">{taxAmount} ريال</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>الإجمالي:</span>
                  <span data-testid="text-total-amount">{totalAmount} ريال</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">ملاحظات</h3>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
              <p>شكراً لتعاملكم معنا</p>
              <p>هذه فاتورة ضريبية مبسطة صادرة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-0 { border: none !important; }
        }
      `}</style>
    </div>
  );
}
