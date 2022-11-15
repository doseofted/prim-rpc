import Head from 'next/head'
import { Docs } from "@doseofted/prim-ui/react"
import docs from "@doseofted/prim-example/dist/docs.json"
import { Light, Lights } from '../components/Lights'

export default function Home() {
  return (
    <>
      <Head>
        <title>Hi</title>
      </Head>
      <div className='bg-gray-100 font-sans'>
        <Lights>
          <Light><p>Hello</p></Light>
        </Lights>
        <Docs docs={docs} />
      </div>
    </>
  )
}
