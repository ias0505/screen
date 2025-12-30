import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Building2, User, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWorkContext } from "@/hooks/use-work-context";
import type { TeamMember, User as UserType } from "@shared/schema";

interface AcceptedTeam {
  ownerId: string;
  ownerName: string;
  permission: string;
}

export function WorkContextSwitcher() {
  const { context, switchToPersonal, switchToCompany, setAvailableCompanies } = useWorkContext();

  const { data: acceptedTeams = [] } = useQuery<(TeamMember & { owner: UserType })[]>({
    queryKey: ['/api/team/accepted'],
  });

  const handleSwitchToPersonal = () => {
    switchToPersonal();
    queryClient.invalidateQueries();
  };

  const handleSwitchToCompany = (ownerId: string, ownerName: string) => {
    switchToCompany(ownerId, ownerName);
    queryClient.invalidateQueries();
  };

  const companies: AcceptedTeam[] = acceptedTeams.map(t => {
    const firstName = t.owner?.firstName || '';
    const lastName = t.owner?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      ownerId: t.ownerId,
      ownerName: t.owner?.companyName || fullName || 'شركة',
      permission: t.permission,
    };
  });

  const prevCompaniesRef = useRef<string>("");
  useEffect(() => {
    const companiesKey = companies.map(c => `${c.ownerId}:${c.permission}`).join(',');
    if (companies.length > 0 && companiesKey !== prevCompaniesRef.current) {
      prevCompaniesRef.current = companiesKey;
      setAvailableCompanies(companies);
    }
  }, [companies, setAvailableCompanies]);

  if (companies.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2" data-testid="button-context-switcher">
          {context.type === 'personal' ? (
            <>
              <User className="w-4 h-4" />
              <span className="flex-1 text-right">حسابي الشخصي</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4" />
              <span className="flex-1 text-right truncate">{context.companyName}</span>
            </>
          )}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={handleSwitchToPersonal}
          data-testid="menu-switch-personal"
        >
          <User className="w-4 h-4 ml-2" />
          <span className="flex-1">حسابي الشخصي</span>
          {context.type === 'personal' && <Check className="w-4 h-4" />}
        </DropdownMenuItem>
        
        {companies.length > 0 && <DropdownMenuSeparator />}
        
        {companies.map((company) => (
          <DropdownMenuItem 
            key={company.ownerId}
            onClick={() => handleSwitchToCompany(company.ownerId, company.ownerName)}
            data-testid={`menu-switch-company-${company.ownerId}`}
          >
            <Building2 className="w-4 h-4 ml-2" />
            <span className="flex-1 truncate">{company.ownerName}</span>
            {context.type === 'company' && context.companyOwnerId === company.ownerId && (
              <Check className="w-4 h-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ContextChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  ownerId: string;
}

export function ContextChoiceDialog({ open, onOpenChange, companyName, ownerId }: ContextChoiceDialogProps) {
  const { switchToPersonal, switchToCompany } = useWorkContext();

  const handlePersonal = () => {
    switchToPersonal();
    queryClient.invalidateQueries();
    onOpenChange(false);
  };

  const handleCompany = () => {
    switchToCompany(ownerId, companyName);
    queryClient.invalidateQueries();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>اختر سياق العمل</DialogTitle>
          <DialogDescription>
            تم قبول دعوتك من {companyName}. اختر أين تريد العمل الآن:
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex items-center gap-3 justify-start"
            onClick={handlePersonal}
            data-testid="button-choose-personal"
          >
            <User className="w-6 h-6 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium">حسابي الشخصي</div>
              <div className="text-sm text-muted-foreground">عرض وإدارة شاشاتي ومحتواي الخاص</div>
            </div>
          </Button>
          <Button
            variant="default"
            className="h-auto py-4 flex items-center gap-3 justify-start"
            onClick={handleCompany}
            data-testid="button-choose-company"
          >
            <Building2 className="w-6 h-6" />
            <div className="text-right">
              <div className="font-medium">{companyName}</div>
              <div className="text-sm opacity-80">الانتقال لإدارة محتوى الشركة</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
