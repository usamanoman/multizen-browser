/**
 * Network utility functions for checking connectivity and diagnosing issues
 */

export interface NetworkStatus {
    isOnline: boolean;
    canReachGoogle: boolean;
    canReachTarget: boolean;
    lastChecked: Date;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Test if a specific URL is reachable
 */
export async function testUrlReachability(url: string): Promise<boolean> {
    try {
        // Create a test request with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.warn(`Failed to reach ${url}:`, error);
        return false;
    }
}

/**
 * Test if Google is reachable (common connectivity test)
 */
export async function testGoogleConnectivity(): Promise<boolean> {
    return testUrlReachability('https://www.google.com');
}

/**
 * Test if the target URL is reachable
 */
export async function testTargetConnectivity(url: string): Promise<boolean> {
    if (!url || url.startsWith('file://') || url.startsWith('data:')) {
        return true; // Local URLs are always reachable
    }
    
    return testUrlReachability(url);
}

/**
 * Get comprehensive network status
 */
export async function getNetworkStatus(targetUrl?: string): Promise<NetworkStatus> {
    const isOnline = navigator.onLine;
    const canReachGoogle = isOnline ? await testGoogleConnectivity() : false;
    const canReachTarget = targetUrl && isOnline ? await testTargetConnectivity(targetUrl) : false;
    
    return {
        isOnline,
        canReachGoogle,
        canReachTarget: canReachTarget || !targetUrl,
        lastChecked: new Date(),
    };
}

/**
 * Get user-friendly network error message
 */
export function getNetworkErrorMessage(status: NetworkStatus, targetUrl?: string): string {
    if (!status.isOnline) {
        return 'No internet connection detected. Please check your network settings and try again.';
    }
    
    if (!status.canReachGoogle) {
        return 'Internet connection is available but some services may be unreachable. This could be due to network restrictions or DNS issues.';
    }
    
    if (targetUrl && !status.canReachTarget) {
        return `Unable to reach the target website (${targetUrl}). The site may be down or blocked by your network.`;
    }
    
    return 'Network connectivity appears to be working normally.';
}
