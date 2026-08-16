/**
 * Public QR code page — shareable/printable page that opens the tenant's
 * WhatsApp channel via a wa.me link. No authentication required.
 *
 * Route: /qr/:token  (optional ?msg=... pre-filled message)
 */
import { useQuery } from "@tanstack/react-query";
import { useRoute, useSearchParams } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { MessageCircle, Loader2, WifiOff, Printer } from "lucide-react";
import { getPublicWaLink } from "@/lib/api";

export default function QrPublicPage() {
  const [, params] = useRoute("/qr/:token");
  const token = params?.token ?? null;
  const [searchParams] = useSearchParams();
  const msg = searchParams.get("msg") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-wa-link", token],
    queryFn: () => getPublicWaLink(token!),
    enabled: !!token,
    retry: 1,
  });

  // The marker lets the central attribute this contact to the QR channel.
  const fullMsg = data
    ? `${msg.trim() ? `${msg.trim()}\n\n` : ""}(${data.qrMarker})`
    : "";
  const waLink =
    data?.connected && data.phoneNumber
      ? `https://wa.me/${data.phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(fullMsg)}`
      : null;

  return (
    <div className="min-h-[100dvh] bg-[#F4F7F8] flex items-center justify-center p-6 print:bg-white">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center print:shadow-none">
        <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-7 h-7 text-[#25D366]" />
        </div>

        {isLoading && (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#25D366] animate-spin" />
          </div>
        )}

        {(isError || (data && !waLink)) && !isLoading && (
          <div className="py-8">
            <WifiOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              Canal de atendimento indisponível
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {isError
                ? "Não foi possível carregar as informações."
                : "O WhatsApp desta central ainda não está conectado."}
            </p>
          </div>
        )}

        {waLink && data && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {data.tenantName}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Escaneie o QR code para falar conosco pelo WhatsApp
            </p>

            <div className="flex justify-center mb-6">
              <div className="p-4 border-2 border-gray-100 rounded-xl inline-block">
                <QRCodeSVG value={waLink} size={224} level="M" />
              </div>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors print:hidden"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir no WhatsApp
            </a>

            <button
              onClick={() => window.print()}
              className="mt-4 mx-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir esta página
            </button>
          </>
        )}
      </div>
    </div>
  );
}
