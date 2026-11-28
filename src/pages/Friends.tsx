
<div
  key={friend.id}
  className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-2 rounded-2xl border border-border/50 bg-card p-2.5 shadow-sm transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_auto] sm:gap-x-3 sm:p-3"
>
  <Link
    to={`/profile/${friendUser.username}`}
    className="row-span-2 sm:row-span-1"
    aria-label={`View ${friendUser.name}'s profile`}
  >
    <Avatar className="h-11 w-11 ring-2 ring-primary/10 sm:h-12 sm:w-12">
      <AvatarImage src={friendUser.avatar} />
      <AvatarFallback className="text-sm font-semibold">
        {friendUser.name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  </Link>

  <div className="min-w-0">
    <Link to={`/profile/${friendUser.username}`} className="block">
      <h3 className="flex items-center text-sm font-bold text-foreground hover:text-primary">
        <span className="truncate">{friendUser.name}</span>
        {((friendUser) as any)?.is_verified && (
          <VerifiedBadge size={14} className="ml-1 flex-shrink-0" />
        )}
      </h3>
    </Link>
    <p className="truncate text-xs text-muted-foreground">
      @{friendUser.username}
    </p>
  </div>

  <div className="col-start-2 flex items-center gap-1.5 sm:col-start-3 sm:row-start-1">
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size="sm"
      onClick={() => handleFollowToggle(friendUser.id, isFollowing)}
      className={`h-8 rounded-full px-3 text-xs font-bold shadow-none ${
        isFollowing
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {isFollowing ? (
        <UserCheck className="mr-1 h-3.5 w-3.5" />
      ) : (
        <UserPlus className="mr-1 h-3.5 w-3.5" />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>

    <Button
      variant="outline"
      size="icon"
      onClick={() => openChat(friendUser)}
      disabled={openingChatId === friendUser.id}
      aria-label={`Message ${friendUser.name}`}
      title="Message"
      className="h-8 w-8 rounded-xl border border-primary/20 bg-primary/10 p-0 text-primary shadow-sm backdrop-blur-xl transition-all hover:bg-primary/20"
    >
      <MessageSquareText className="h-4 w-4" strokeWidth={2.2} />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      onClick={() => setConfirmRemove({ friendId: friend.id, friendUser })}
      aria-label={`Remove ${friendUser.name}`}
      title="Remove"
      className="h-8 w-8 rounded-xl bg-destructive/10 p-0 text-destructive shadow-none hover:bg-destructive hover:text-destructive-foreground sm:w-auto sm:px-3"
    >
      <UserMinus className="h-4 w-4" />
      <span className="ml-1.5 hidden sm:inline">Remove</span>
    </Button>
  </div>
</div>
