import { MemberColumn } from '../MemberColumn'
import type { LayoutProps, Member, Timeslot } from '../../types'

export function MemberFocusLayout({
  members,
  timeslots,
  todos,
  completions,
  isTodoCompleted,
  onToggleTodo,
}: LayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {members.map((member: Member) => {
        const memberTimeslots = timeslots.filter((t: Timeslot) => t.member_ids?.includes(member.id))
        return (
          <MemberColumn
            key={member.id}
            member={member}
            timeslots={memberTimeslots}
            todos={todos}
            completions={completions}
            isTodoCompleted={isTodoCompleted}
            onToggleTodo={onToggleTodo}
          />
        )
      })}
    </div>
  )
}
