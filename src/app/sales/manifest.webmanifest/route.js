import {
  buildSalesManifest,
  manifestResponse,
} from "@/lib/pwa/manifestHelpers";

export function GET(request) {
  const hostname = request.headers.get("host") || "";
  return manifestResponse(buildSalesManifest(hostname));
}
