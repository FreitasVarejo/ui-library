import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/lib/icons"
import type { AppLinkComponent, ShellUser, UserMenuItem } from "./types"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export interface UserMenuProps {
  user: ShellUser
  items?: UserMenuItem[]
  label: string
  linkComponent: AppLinkComponent
}

export function UserMenu({
  user,
  items = [],
  label,
  linkComponent,
}: UserMenuProps) {
  const Link = linkComponent
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-2 px-1.5"
            aria-label={label}
          />
        }
      >
        <Avatar size="sm">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm sm:inline">
          {user.name}
        </span>
        <Icons.chevronsUpDown className="hidden size-3.5 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {user.name}
            </span>
            {user.email ? <span className="truncate">{user.email}</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {items.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              variant={item.destructive ? "destructive" : "default"}
              onClick={item.onSelect}
              render={item.href ? <Link href={item.href} /> : undefined}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
