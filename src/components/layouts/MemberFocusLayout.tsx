import { MemberColumn } from '../MemberColumn'
import type { LayoutProps, Member, Timeslot } from '../../types'

export function MemberFocusLayout({
  members,
  timeslots,
  todos,
  completions,
  memberStats,
  isTodoCompleted,
  onToggleTodo,
}: LayoutProps) {
  return (
    <div className="flex gap-4 sm:gap-5 lg:gap-6 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin">
      {members.map((member: Member) => {
        const memberTimeslots = timeslots.filter((t: Timeslot) => t.memberIds?.includes(member.id))
        const stats = memberStats?.find((s) => s.memberId === member.id)
        return (
          <div key={member.id} className="flex-shrink-0 w-80 sm:w-96 snap-start">
            <MemberColumn
              member={member}
              timeslots={memberTimeslots}
              todos={todos}
              completions={completions}
              stats={stats}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={onToggleTodo}
            />
          </div>
        )
      })}
    </div>
  )
}
