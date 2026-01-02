import { useState } from "react";
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
  RefreshCw
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ImageEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("landscape");
  
  const aspectRatios: Record<string, { width: number; height: number; label: string }> = {
    landscape: { width: 1920, height: 1080, label: "أفقي (1920×1080)" },
    portrait: { width: 1080, height: 1920, label: "عمودي (1080×1920)" },
    square: { width: 1024, height: 1024, label: "مربع (1024×1024)" },
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

  const examplePrompts = [
    "إعلان لمطعم عربي فاخر مع أطباق شهية",
    "لافتة ترحيبية لمتجر ملابس عصري",
    "صورة منتج عطر فاخر مع خلفية ذهبية",
    "إعلان خصومات موسمية بألوان زاهية",
    "شاشة انتظار أنيقة لعيادة طبية",
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
                مُنشئ الصور
              </h1>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">أنشئ صور احترافية بالذكاء الاصطناعي من وصف نصي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
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
                      <p className="text-sm text-muted-foreground">جاري إنشاء الصورة...</p>
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
                    onClick={handleGenerate}
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
