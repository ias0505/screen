export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    // Common
    loading: "جاري التحميل...",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    all: "الكل",
    active: "نشط",
    inactive: "غير نشط",
    online: "متصل",
    offline: "غير متصل",
    pending: "قيد الانتظار",
    paid: "مدفوع",
    actions: "إجراءات",
    close: "إغلاق",
    confirm: "تأكيد",
    yes: "نعم",
    no: "لا",
    back: "رجوع",
    next: "التالي",
    submit: "إرسال",
    viewAll: "عرض الكل",
    noData: "لا توجد بيانات",
    
    // Navigation
    nav: {
      dashboard: "لوحة التحكم",
      screens: "الشاشات",
      groups: "المجموعات",
      media: "المحتوى",
      schedule: "الجدولة",
      subscriptions: "الاشتراكات",
      team: "الفريق",
      settings: "الإعدادات",
      admin: "لوحة المدير",
      controlPanel: "لوحة التحكم",
    },
    
    // Auth
    auth: {
      login: "تسجيل الدخول",
      logout: "تسجيل خروج",
      register: "إنشاء حساب",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      forgotPassword: "نسيت كلمة المرور؟",
      resetPassword: "إعادة تعيين كلمة المرور",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      or: "أو",
      continueWithGoogle: "المتابعة مع Google",
      noAccount: "ليس لديك حساب؟",
      haveAccount: "لديك حساب بالفعل؟",
      user: "مستخدم",
    },
    
    // Dashboard
    dashboard: {
      title: "لوحة التحكم",
      overview: "نظرة عامة على أداء الشاشات والمحتوى",
      activeScreens: "الشاشات النشطة",
      mediaLibrary: "مكتبة الوسائط",
      availableScreens: "شاشات متاحة",
      recentScreens: "آخر الشاشات المضافة",
      recentMedia: "أحدث الوسائط",
    },
    
    // Screens
    screens: {
      title: "الشاشات",
      subtitle: "إدارة شاشات العرض",
      addScreen: "إضافة شاشة",
      screenName: "اسم الشاشة",
      location: "الموقع",
      status: "الحالة",
      orientation: "الاتجاه",
      horizontal: "أفقي",
      vertical: "عمودي",
      group: "المجموعة",
      noGroup: "بدون مجموعة",
      activationCode: "رمز التفعيل",
      lastSeen: "آخر ظهور",
      noScreens: "لا توجد شاشات",
      addFirstScreen: "أضف أول شاشة",
    },
    
    // Groups
    groups: {
      title: "المجموعات",
      subtitle: "تنظيم الشاشات في مجموعات",
      addGroup: "إضافة مجموعة",
      groupName: "اسم المجموعة",
      description: "الوصف",
      screensCount: "عدد الشاشات",
      noGroups: "لا توجد مجموعات",
    },
    
    // Media
    media: {
      title: "المحتوى",
      subtitle: "إدارة الصور والفيديوهات",
      upload: "رفع ملف",
      addUrl: "إضافة رابط",
      mediaName: "اسم الوسائط",
      type: "النوع",
      image: "صورة",
      video: "فيديو",
      duration: "المدة",
      seconds: "ثانية",
      noMedia: "لا توجد وسائط",
      uploadFirst: "ارفع أول ملف",
      dragDrop: "اسحب وأفلت الملفات هنا",
      orClick: "أو انقر للاختيار",
    },
    
    // Schedule
    schedule: {
      title: "الجدولة",
      subtitle: "جدولة عرض المحتوى على الشاشات",
      addSchedule: "إضافة جدول",
      selectScreen: "اختر الشاشة",
      selectMedia: "اختر المحتوى",
      startTime: "وقت البداية",
      endTime: "وقت النهاية",
      priority: "الأولوية",
      noSchedules: "لا توجد جداول",
    },
    
    // Subscriptions
    subscriptions: {
      title: "الاشتراكات",
      subtitle: "إدارة اشتراكاتك",
      addSubscription: "إضافة اشتراك",
      screenCount: "عدد الشاشات",
      duration: "المدة",
      year: "سنة",
      years: "سنوات",
      price: "السعر",
      pricePerScreen: "السعر لكل شاشة",
      total: "الإجمالي",
      beforeTax: "قبل الضريبة",
      vat: "ضريبة القيمة المضافة",
      totalWithVat: "الإجمالي شامل الضريبة",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      status: "الحالة",
      invoices: "الفواتير",
      noSubscriptions: "لا توجد اشتراكات",
      discountCode: "كود الخصم",
      applyCode: "تطبيق",
    },
    
    // Team
    team: {
      title: "الفريق",
      subtitle: "إدارة أعضاء الفريق والصلاحيات",
      addMember: "إضافة عضو",
      inviteMember: "دعوة عضو جديد",
      memberEmail: "البريد الإلكتروني للعضو",
      permission: "الصلاحية",
      viewer: "مشاهد",
      editor: "محرر",
      manager: "مدير",
      viewerDesc: "قراءة فقط",
      editorDesc: "قراءة وكتابة",
      managerDesc: "صلاحيات كاملة",
      owner: "المالك",
      noTeamMembers: "لا يوجد أعضاء في الفريق",
      pendingInvitations: "الدعوات المعلقة",
      acceptInvitation: "قبول الدعوة",
      rejectInvitation: "رفض الدعوة",
    },
    
    // Settings
    settings: {
      title: "الإعدادات",
      subtitle: "إعدادات الحساب والتطبيق",
      companyName: "اسم الشركة",
      phone: "رقم الهاتف",
      language: "اللغة",
      theme: "المظهر",
      light: "فاتح",
      dark: "داكن",
      system: "النظام",
      changePassword: "تغيير كلمة المرور",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      saveChanges: "حفظ التغييرات",
    },
    
    // Activation
    activation: {
      title: "تفعيل الشاشة",
      subtitle: "أدخل رمز التفعيل لتشغيل الشاشة",
      enterCode: "أدخل رمز التفعيل",
      activate: "تفعيل",
      scanQR: "مسح رمز QR",
      orEnterCode: "أو أدخل الرمز يدوياً",
    },
    
    // Invoices
    invoices: {
      title: "الفواتير",
      invoiceNumber: "رقم الفاتورة",
      date: "التاريخ",
      amount: "المبلغ",
      status: "الحالة",
      download: "تحميل",
      view: "عرض",
    },
    
    // Admin
    admin: {
      dashboard: "لوحة الإدارة",
      users: "المستخدمين",
      allInvoices: "جميع الفواتير",
      allSubscriptions: "جميع الاشتراكات",
      allScreens: "جميع الشاشات",
      activityLog: "سجل النشاط",
      admins: "المديرين",
      plans: "الخطط",
      discountCodes: "أكواد الخصم",
      systemSettings: "إعدادات النظام",
    },
    
    // Errors & Messages
    messages: {
      success: "تم بنجاح",
      error: "حدث خطأ",
      saved: "تم الحفظ",
      deleted: "تم الحذف",
      updated: "تم التحديث",
      created: "تم الإنشاء",
      required: "هذا الحقل مطلوب",
      invalidEmail: "بريد إلكتروني غير صالح",
      passwordMismatch: "كلمات المرور غير متطابقة",
      minLength: "الحد الأدنى للأحرف",
      maxLength: "الحد الأقصى للأحرف",
    },
    
    // Currency
    currency: {
      sar: "ر.س",
    },
  },
  
  en: {
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    online: "Online",
    offline: "Offline",
    pending: "Pending",
    paid: "Paid",
    actions: "Actions",
    close: "Close",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    back: "Back",
    next: "Next",
    submit: "Submit",
    viewAll: "View All",
    noData: "No data available",
    
    // Navigation
    nav: {
      dashboard: "Dashboard",
      screens: "Screens",
      groups: "Groups",
      media: "Media",
      schedule: "Schedule",
      subscriptions: "Subscriptions",
      team: "Team",
      settings: "Settings",
      admin: "Admin Panel",
      controlPanel: "Control Panel",
    },
    
    // Auth
    auth: {
      login: "Login",
      logout: "Logout",
      register: "Create Account",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      forgotPassword: "Forgot Password?",
      resetPassword: "Reset Password",
      firstName: "First Name",
      lastName: "Last Name",
      or: "or",
      continueWithGoogle: "Continue with Google",
      noAccount: "Don't have an account?",
      haveAccount: "Already have an account?",
      user: "User",
    },
    
    // Dashboard
    dashboard: {
      title: "Dashboard",
      overview: "Overview of screens and content performance",
      activeScreens: "Active Screens",
      mediaLibrary: "Media Library",
      availableScreens: "Available Screens",
      recentScreens: "Recently Added Screens",
      recentMedia: "Recent Media",
    },
    
    // Screens
    screens: {
      title: "Screens",
      subtitle: "Manage display screens",
      addScreen: "Add Screen",
      screenName: "Screen Name",
      location: "Location",
      status: "Status",
      orientation: "Orientation",
      horizontal: "Horizontal",
      vertical: "Vertical",
      group: "Group",
      noGroup: "No Group",
      activationCode: "Activation Code",
      lastSeen: "Last Seen",
      noScreens: "No screens",
      addFirstScreen: "Add your first screen",
    },
    
    // Groups
    groups: {
      title: "Groups",
      subtitle: "Organize screens into groups",
      addGroup: "Add Group",
      groupName: "Group Name",
      description: "Description",
      screensCount: "Screens Count",
      noGroups: "No groups",
    },
    
    // Media
    media: {
      title: "Media",
      subtitle: "Manage images and videos",
      upload: "Upload File",
      addUrl: "Add URL",
      mediaName: "Media Name",
      type: "Type",
      image: "Image",
      video: "Video",
      duration: "Duration",
      seconds: "seconds",
      noMedia: "No media",
      uploadFirst: "Upload your first file",
      dragDrop: "Drag and drop files here",
      orClick: "or click to select",
    },
    
    // Schedule
    schedule: {
      title: "Schedule",
      subtitle: "Schedule content display on screens",
      addSchedule: "Add Schedule",
      selectScreen: "Select Screen",
      selectMedia: "Select Media",
      startTime: "Start Time",
      endTime: "End Time",
      priority: "Priority",
      noSchedules: "No schedules",
    },
    
    // Subscriptions
    subscriptions: {
      title: "Subscriptions",
      subtitle: "Manage your subscriptions",
      addSubscription: "Add Subscription",
      screenCount: "Screen Count",
      duration: "Duration",
      year: "year",
      years: "years",
      price: "Price",
      pricePerScreen: "Price per Screen",
      total: "Total",
      beforeTax: "Before Tax",
      vat: "VAT",
      totalWithVat: "Total with VAT",
      startDate: "Start Date",
      endDate: "End Date",
      status: "Status",
      invoices: "Invoices",
      noSubscriptions: "No subscriptions",
      discountCode: "Discount Code",
      applyCode: "Apply",
    },
    
    // Team
    team: {
      title: "Team",
      subtitle: "Manage team members and permissions",
      addMember: "Add Member",
      inviteMember: "Invite New Member",
      memberEmail: "Member Email",
      permission: "Permission",
      viewer: "Viewer",
      editor: "Editor",
      manager: "Manager",
      viewerDesc: "Read only",
      editorDesc: "Read and write",
      managerDesc: "Full permissions",
      owner: "Owner",
      noTeamMembers: "No team members",
      pendingInvitations: "Pending Invitations",
      acceptInvitation: "Accept Invitation",
      rejectInvitation: "Reject Invitation",
    },
    
    // Settings
    settings: {
      title: "Settings",
      subtitle: "Account and application settings",
      companyName: "Company Name",
      phone: "Phone Number",
      language: "Language",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
      changePassword: "Change Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      saveChanges: "Save Changes",
    },
    
    // Activation
    activation: {
      title: "Screen Activation",
      subtitle: "Enter activation code to start the screen",
      enterCode: "Enter Activation Code",
      activate: "Activate",
      scanQR: "Scan QR Code",
      orEnterCode: "Or enter code manually",
    },
    
    // Invoices
    invoices: {
      title: "Invoices",
      invoiceNumber: "Invoice Number",
      date: "Date",
      amount: "Amount",
      status: "Status",
      download: "Download",
      view: "View",
    },
    
    // Admin
    admin: {
      dashboard: "Admin Dashboard",
      users: "Users",
      allInvoices: "All Invoices",
      allSubscriptions: "All Subscriptions",
      allScreens: "All Screens",
      activityLog: "Activity Log",
      admins: "Admins",
      plans: "Plans",
      discountCodes: "Discount Codes",
      systemSettings: "System Settings",
    },
    
    // Errors & Messages
    messages: {
      success: "Success",
      error: "An error occurred",
      saved: "Saved",
      deleted: "Deleted",
      updated: "Updated",
      created: "Created",
      required: "This field is required",
      invalidEmail: "Invalid email",
      passwordMismatch: "Passwords do not match",
      minLength: "Minimum characters",
      maxLength: "Maximum characters",
    },
    
    // Currency
    currency: {
      sar: "SAR",
    },
  },
};

export type Translations = typeof translations.ar;
