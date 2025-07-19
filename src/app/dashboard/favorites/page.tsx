
import { ServerList } from "@/components/dashboard/server-list";

export default function FavoritesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Favorite Servers
        </h1>
        <p className="text-muted-foreground">
          Your collection of starred servers for quick access.
        </p>
      </div>
      
      <ServerList showOnlyFavorites={true} />

    </div>
  );
}
