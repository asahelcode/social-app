import React from 'react'
import {View} from 'react-native'
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated'
import {AppBskyActorDefs, moderateProfile, ModerationOpts} from '@atproto/api'
import {flip, offset, shift, size, useFloating} from '@floating-ui/react-dom'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {pluralize} from '#/lib/strings/helpers'
import {useModerationOpts} from '#/state/queries/preferences'
import {usePrefetchProfileQuery, useProfileQuery} from '#/state/queries/profile'
import {useProfileShadow} from 'state/cache/profile-shadow'
import {formatCount} from '#/view/com/util/numeric/format'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {ProfileHeaderHandle} from '#/screens/Profile/Header/Handle'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {useFollowMethods} from '#/components/hooks/useFollowMethods'
import {useRichText} from '#/components/hooks/useRichText'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {InlineLinkText, Link} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Portal} from '#/components/Portal'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {ProfileHoverCardProps} from './types'

const floatingMiddlewares = [
  offset(4),
  flip({padding: 16}),
  shift({padding: 16}),
  size({
    padding: 16,
    apply({availableWidth, availableHeight, elements}) {
      Object.assign(elements.floating.style, {
        maxWidth: `${availableWidth}px`,
        maxHeight: `${availableHeight}px`,
      })
    },
  }),
]

export function ProfileHoverCard(props: ProfileHoverCardProps) {
  const prefetchProfileQuery = usePrefetchProfileQuery()
  const [hovered, setHovered] = React.useState(false)
  const {refs, floatingStyles} = useFloating({
    middleware: floatingMiddlewares,
  })
  const onPointerEnter = React.useCallback(() => {
    prefetchProfileQuery(props.did)
    setHovered(true)
  }, [props.did, prefetchProfileQuery, setHovered])
  const onPointerLeave = React.useCallback(() => {
    setHovered(false)
  }, [])

  return (
    <div
      ref={refs.setReference}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onPointerLeave}>
      {props.children}

      {hovered && (
        <Portal>
          <Animated.View
            entering={FadeIn.duration(80)}
            exiting={FadeOut.duration(80)}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}>
              <Card did={props.did} />
            </div>
          </Animated.View>
        </Portal>
      )}
    </div>
  )
}

function Card({did}: {did: string}) {
  const t = useTheme()

  const profile = useProfileQuery({did})
  const moderationOpts = useModerationOpts()

  const data = profile.data

  return (
    <View
      style={[
        a.p_lg,
        a.border,
        a.rounded_md,
        a.overflow_hidden,
        t.atoms.bg,
        t.atoms.border_contrast_low,
        t.atoms.shadow_lg,
        {
          width: 300,
        },
      ]}>
      {data && moderationOpts ? (
        <Inner profile={data} moderationOpts={moderationOpts} />
      ) : (
        <View style={[a.justify_center]}>
          <Loader size="xl" />
        </View>
      )}
    </View>
  )
}

function Inner({
  profile,
  moderationOpts,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
}) {
  const t = useTheme()
  const {_} = useLingui()
  const moderation = React.useMemo(
    () => moderateProfile(profile, moderationOpts),
    [profile, moderationOpts],
  )
  const [descriptionRT] = useRichText(profile.description ?? '')
  const profileShadow = useProfileShadow(profile)
  const {follow, unfollow} = useFollowMethods({
    profile: profileShadow,
    logContext: 'ProfileHoverCard',
  })
  const blockHide = profile.viewer?.blocking || profile.viewer?.blockedBy
  const following = formatCount(profile.followsCount || 0)
  const followers = formatCount(profile.followersCount || 0)
  const pluralizedFollowers = pluralize(profile.followersCount || 0, 'follower')
  const profileURL = makeProfileLink({
    did: profile.did,
    handle: profile.handle,
  })

  return (
    <View>
      <View style={[a.flex_row, a.justify_between, a.align_start]}>
        <Link to={profileURL} label={_(msg`View profile`)}>
          <UserAvatar
            size={64}
            avatar={profile.avatar}
            moderation={moderation.ui('avatar')}
          />
        </Link>

        <Button
          size="small"
          color={profileShadow.viewer?.following ? 'secondary' : 'primary'}
          variant="solid"
          label={profileShadow.viewer?.following ? _('Following') : _('Follow')}
          style={[a.rounded_full]}
          onPress={profileShadow.viewer?.following ? unfollow : follow}>
          <ButtonIcon
            position="left"
            icon={profileShadow.viewer?.following ? Check : Plus}
          />
          <ButtonText>
            {profileShadow.viewer?.following ? _('Following') : _('Follow')}
          </ButtonText>
        </Button>
      </View>

      <Link to={profileURL} label={_(msg`View profile`)}>
        <View style={[a.pb_sm, a.flex_1]}>
          <Text style={[a.pt_md, a.pb_xs, a.text_lg, a.font_bold]}>
            {sanitizeDisplayName(
              profile.displayName || sanitizeHandle(profile.handle),
              moderation.ui('displayName'),
            )}
          </Text>

          <ProfileHeaderHandle profile={profileShadow} />
        </View>
      </Link>

      {!blockHide && (
        <>
          <View style={[a.flex_row, a.flex_wrap, a.gap_md, a.pt_xs]}>
            <InlineLinkText
              to={makeProfileLink(profile, 'followers')}
              label={`${followers} ${pluralizedFollowers}`}
              style={[t.atoms.text]}>
              <Trans>
                <Text style={[a.text_md, a.font_bold]}>{followers} </Text>
                <Text>{pluralizedFollowers}</Text>
              </Trans>
            </InlineLinkText>
            <InlineLinkText
              to={makeProfileLink(profile, 'follows')}
              label={_(msg`${following} following`)}
              style={[t.atoms.text]}>
              <Trans>
                <Text style={[a.text_md, a.font_bold]}>{following} </Text>
                <Text>following</Text>
              </Trans>
            </InlineLinkText>
          </View>

          {profile.description?.trim() && !moderation.ui('profileView').blur ? (
            <View style={[a.pt_md]}>
              <RichText numberOfLines={8} value={descriptionRT} />
            </View>
          ) : undefined}
        </>
      )}
    </View>
  )
}