import { useScreens } from "@/hooks/use-screens";
import { useMedia } from "@/hooks/use-media";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { Monitor, Image as ImageIcon, MonitorCheck, PlayCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: screens = [], isLoading: loadingScreens } = useScreens();
  const { data: media = [], isLoading: loadingMedia } = useMedia();
  const { t, language } = useLanguage();
  
  const { data: slotsData } = useQuery<{ availableSlots: number }>({
    queryKey: ['/api/subscriptions/available-slots'],
  });

  const activeScreens = screens.filter(s => s.status === 'online').length;
  const totalScreens = screens.length;
  const totalMedia = media.length;
  const availableSlots = slotsData?.availableSlots ?? 0;

  const stats = [
    {
      title: t.dashboard.activeScreens,
      value: `${activeScreens} / ${totalScreens}`,
      icon: Monitor,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      href: "/screens"
    },
    {
      title: t.dashboard.mediaLibrary,
      value: totalMedia,
      icon: ImageIcon,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/media"
    },
    {
      title: t.dashboard.availableScreens,
      value: availableSlots,
      icon: MonitorCheck,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/screens"
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const formatDate = (date: string | Date) => {
    const locale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(date).toLocaleDateString(locale);
  };

  if (loadingScreens || loadingMedia) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-2">{t.dashboard.overview}</p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {stats.map((stat, i) => (
            <Link key={i} href={stat.href}>
              <motion.div 
                variants={item}
                className="bg-card hover:bg-card/50 border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">{stat.value}</h3>
                  </div>
                  <div className={`p-4 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border/50 shadow-sm p-6"
          >
            <div className="flex items-center justify-between gap-2 mb-6">
              <h3 className="text-xl font-bold">{t.dashboard.recentScreens}</h3>
              <Link href="/screens" className="text-sm text-primary hover:underline">{t.viewAll}</Link>
            </div>
            <div className="space-y-4">
              {screens.slice(0, 5).map((screen) => (
                <div key={screen.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{screen.name}</p>
                      <p className="text-xs text-muted-foreground">{screen.location || (language === 'ar' ? 'بدون موقع' : 'No location')}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    screen.status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {screen.status === 'online' ? t.online : t.offline}
                  </div>
                </div>
              ))}
              {screens.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t.screens.noScreens}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: language === 'ar' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border/50 shadow-sm p-6"
          >
             <div className="flex items-center justify-between gap-2 mb-6">
              <h3 className="text-xl font-bold">{t.dashboard.recentMedia}</h3>
              <Link href="/media" className="text-sm text-primary hover:underline">{t.viewAll}</Link>
            </div>
            <div className="space-y-4">
              {media.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-background border border-border">
                    {item.type === 'image' ? (
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/5">
                        <PlayCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt!)}</p>
                  </div>
                </div>
              ))}
              {media.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t.media.noMedia}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
