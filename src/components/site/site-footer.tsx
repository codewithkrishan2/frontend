import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex h-14 items-center text-sm text-muted-foreground">
        <p>
          {siteConfig.name} · {new Date().getFullYear()}
        </p>
      </Container>
    </footer>
  );
}
