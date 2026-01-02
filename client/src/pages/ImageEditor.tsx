import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { 
  Wand2, 
  Download, 
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Save,
  RefreshCw,
  Upload,
  X,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ImageEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("landscape");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  
  const aspectRatios: Record<string, { width: number; height: number; label: string }> = {
    landscape: { width: 1920, height: 1080, label: "أفقي (1920×1080)" },
    portrait: { width: 1080, height: 1920, label: "عمودي (1080×1920)" },
    square: { width: 1024, height: 1024, label: "مربع (1024×1024)" },
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "الرجاء اختيار ملف صورة", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت", variant: "destructive" });
      return;
    }

    setSourceImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    setSourceImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال وصف للصورة", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { width, height } = aspectRatios[aspectRatio];
      const response = await apiRequest("POST", "/api/ai/generate-image", {
        prompt: prompt.trim(),
        width,
        height,
      });
      
      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({ title: "تم", description: "تم إنشاء الصورة بنجاح" });
      }
    } catch (error: any) {
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في إنشاء الصورة", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (!prompt.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال وصف التعديل", variant: "destructive" });
      return;
    }

    if (!sourceImage) {
      toast({ title: "خطأ", description: "الرجاء رفع صورة أولاً", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/edit-image", {
        prompt: prompt.trim(),
        imageData: sourceImage,
      });
      
      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({ title: "تم", description: "تم تعديل الصورة بنجاح" });
      }
    } catch (error: any) {
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في تعديل الصورة", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToMedia = async () => {
    if (!generatedImage || !user) return;
    
    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/ai/save-image", {
        imageUrl: generatedImage,
        title: prompt.slice(0, 50) || "صورة AI",
      });
      
      if (response.ok) {
        toast({ title: "تم الحفظ", description: "تم حفظ الصورة في مكتبة المحتوى" });
        queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      }
    } catch (error: any) {
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في حفظ الصورة", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-image-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const examplePrompts = mode === "generate" ? [
    "إعلان لمطعم عربي فاخر مع أطباق شهية",
    "لافتة ترحيبية لمتجر ملابس عصري",
    "صورة منتج عطر فاخر مع خلفية ذهبية",
    "إعلان خصومات موسمية بألوان زاهية",
    "شاشة انتظار أنيقة لعيادة طبية",
  ] : [
    "أضف نص ترحيبي بالعربي",
    "غير الخلفية إلى لون ذهبي",
    "أضف إطار أنيق حول الصورة",
    "حسّن الإضاءة والألوان",
    "أضف شعار في الزاوية",
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                محرر الصور
              </h1>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">أنشئ وعدّل صور احترافية بالذكاء الاصطناعي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "generate" | "edit")}>
                <TabsList className="w-full">
                  <TabsTrigger value="generate" className="flex-1" data-testid="tab-generate">
                    <Sparkles className="w-4 h-4 ms-2" />
                    إنشاء صورة جديدة
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1" data-testid="tab-edit">
                    <PenTool className="w-4 h-4 ms-2" />
                    تعديل صورة
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      وصف الصورة
                    </label>
                    <Textarea
                      placeholder="اكتب وصفاً تفصيلياً للصورة التي تريد إنشائها..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px] resize-none"
                      data-testid="input-prompt"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">أبعاد الصورة</label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger data-testid="select-aspect-ratio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(aspectRatios).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ms-2" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 ms-2" />
                        إنشاء الصورة
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="edit" className="space-y-4 mt-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground mb-2">
                    <p>ملاحظة: تعديل الصور بالذكاء الاصطناعي في مرحلة تجريبية. الصورة المرفوعة ستُستخدم كمرجع للتعديل.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      الصورة الأصلية
                    </label>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file"
                    />

                    {sourceImage ? (
                      <div className="relative rounded-xl overflow-hidden bg-muted">
                        <img 
                          src={sourceImage} 
                          alt="Source" 
                          className="w-full h-40 object-contain"
                          data-testid="img-source"
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 left-2"
                          onClick={clearSourceImage}
                          data-testid="button-clear-source"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                        data-testid="button-upload"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">اضغط لرفع صورة</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-primary" />
                      وصف التعديل
                    </label>
                    <Textarea
                      placeholder="اكتب التعديلات التي تريد إجراءها على الصورة..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px] resize-none"
                      data-testid="input-edit-prompt"
                    />
                  </div>

                  <Button 
                    onClick={handleEditImage} 
                    disabled={isGenerating || !prompt.trim() || !sourceImage}
                    className="w-full"
                    data-testid="button-edit"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ms-2" />
                        جاري التعديل...
                      </>
                    ) : (
                      <>
                        <PenTool className="w-4 h-4 ms-2" />
                        تعديل الصورة
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">أمثلة للإلهام:</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(example)}
                      className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors text-start"
                      data-testid={`button-example-${idx}`}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="aspect-video bg-muted rounded-xl overflow-hidden flex items-center justify-center relative">
                {generatedImage ? (
                  <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="w-full h-full object-contain"
                    data-testid="img-generated"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p>الصورة ستظهر هنا</p>
                  </div>
                )}
                {isGenerating && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {mode === "generate" ? "جاري إنشاء الصورة..." : "جاري تعديل الصورة..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={handleSaveToMedia} 
                    disabled={isSaving}
                    className="flex-1"
                    data-testid="button-save"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin ms-2" />
                    ) : (
                      <Save className="w-4 h-4 ms-2" />
                    )}
                    حفظ في المكتبة
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownload}
                    data-testid="button-download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={mode === "generate" ? handleGenerate : handleEditImage}
                    disabled={isGenerating}
                    data-testid="button-regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
