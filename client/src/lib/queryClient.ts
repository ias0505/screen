import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getWorkContextHeaders(): HeadersInit {
  try {
    const stored = localStorage.getItem('work-context');
    if (stored) {
      const parsed = JSON.parse(stored);
      const context = parsed.state?.context;
      if (context?.type === 'company' && context.companyOwnerId) {
        return { 'X-Work-Context': context.companyOwnerId };
      }
    }
  } catch (e) {
    console.error('Failed to read work context', e);
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const contextHeaders = getWorkContextHeaders();
  const res = await fetch(url, {
    method,
    headers: { 
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...contextHeaders
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const contextHeaders = getWorkContextHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: contextHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
