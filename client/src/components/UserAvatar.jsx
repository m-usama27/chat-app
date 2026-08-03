import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, stringToColor } from "@/lib/utils";

/**
 * Reusable avatar component that displays user avatar or initials fallback
 */
export default function UserAvatar({
  user,
  size = "default",
  showStatus = false,
  className,
}) {
  const name = user?.displayName || user?.username || "?";
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  };

  const textSizes = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
    xl: "text-2xl",
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {user?.avatar && <AvatarImage src={user.avatar} alt={name} />}
        <AvatarFallback
          className={cn(
            bgColor,
            "text-white font-semibold",
            textSizes[size]
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
            user?.status === "online"
              ? "bg-green-500"
              : "bg-gray-400",
            size === "sm" ? "h-2 w-2" : "h-3 w-3"
          )}
        />
      )}
    </div>
  );
}