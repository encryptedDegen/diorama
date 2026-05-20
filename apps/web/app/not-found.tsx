import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <CardContent className="empty">
        <div>
          <Badge>404</Badge>
          <h1>Scene not found</h1>
          <p className="muted">The requested Diorama page does not exist.</p>
          <Link className="ui-button ui-button-default" href="/">
            Back to Library
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
